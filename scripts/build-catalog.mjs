import { readdir, readFile, mkdir, cp, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const compare = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
const visible = (item) => !item.name.startsWith('.') && !item.isSymbolicLink();
const fail = (context, message) => { throw new Error(`${context}: ${message}`); };
const string = (value, context) => { if (typeof value !== 'string' || !value.trim()) fail(context, 'must be a non-empty string'); return value.trim(); };
const array = (value, context) => { if (!Array.isArray(value)) fail(context, 'must be an array'); return value; };
function unique(items, context) { const values = new Set(); for (const item of items) { if (values.has(item)) fail(context, `duplicate value ${item}`); values.add(item); } }
async function json(file) {
  let value;
  try { value = JSON.parse(await readFile(file, 'utf8')); } catch (error) { fail(file, `invalid JSON: ${error.message}`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(file, 'must contain an object');
  return value;
}

export async function buildCatalog(root) {
  const config = await json(path.join(root, 'catalog.config.json'));
  const departments = array(config.departments, 'departments').map((d) => ({ id: string(d?.id, 'department.id'), name: string(d?.name, 'department.name') }));
  const majors = array(config.majors ?? [], 'majors').map((m) => ({ id: string(m?.id, 'major.id'), name: string(m?.name, 'major.name') }));
  const semesters = array(config.semesters, 'semesters').map((s) => {
    if (!Number.isSafeInteger(s?.order)) fail('semester.order', 'must be a safe integer; larger values appear first');
    return { id: string(s.id, 'semester.id'), name: string(s.name, 'semester.name'), order: s.order };
  });
  unique(departments.map((d) => d.id), 'departments'); unique(majors.map((m) => m.id), 'majors'); unique(semesters.map((s) => s.id), 'semesters');
  const departmentIds = new Set(departments.map((d) => d.id));
  const majorIds = new Set(majors.map((m) => m.id));
  const semesterIds = new Set(semesters.map((s) => s.id));
  const target = path.join(root, 'public/materials');
  const copies = [];
  async function externalResources(directory, files) {
    const manifest = await json(path.join(directory, 'downloads.json'));
    for (const item of array(manifest.files, 'downloads.files')) {
      const resource = {};
      for (const key of ['name', 'folder', 'type']) resource[key] = key === 'folder' ? String(item[key] ?? '') : string(item[key], `download.${key}`);
      if (!Number.isSafeInteger(item.size) || item.size < 0) fail('download.size', 'must be a nonnegative integer');
      resource.size = item.size;
      for (const key of ['url', 'backupUrl']) {
        if (key === 'backupUrl' && item[key] === undefined) continue;
        const url = new URL(string(item[key], `download.${key}`));
        if (url.protocol !== 'https:' || !['media.githubusercontent.com', 'github.com'].includes(url.hostname) || url.username || url.password) fail('download.url', 'requires an HTTPS GitHub download URL');
        resource[key] = url.href;
      }
      files.push(resource);
    }
  }
  const professors = new Map();
  const allListings = new Set();
  const courses = [];
  const roots = [];
  async function discover(directory, parts, insideCourse = false) {
    const entries = (await readdir(directory, { withFileTypes: true })).filter(visible).sort((a, b) => compare(a.name, b.name));
    const hasCourse = entries.some((e) => e.isFile() && e.name === 'course.json');
    if (entries.some((e) => e.isFile() && e.name === 'offering.json') && !insideCourse) fail(parts.join('/'), 'offering.json must be inside a course folder');
    if (hasCourse) { if (insideCourse) fail(parts.join('/'), 'course.json cannot be nested inside another course'); roots.push({ directory, parts }); }
    for (const item of entries.filter((e) => e.isDirectory())) await discover(path.join(directory, item.name), [...parts, item.name], insideCourse || hasCourse);
  }
  await discover(path.join(root, 'courses'), []);
  async function collect(directory, parts, files, offeringRoots, offeringCollector) {
    const entries = (await readdir(directory, { withFileTypes: true })).filter(visible).sort((a, b) => compare(a.name, b.name));
    if (entries.some((e) => e.isFile() && e.name === 'offering.json')) {
      if (!offeringCollector) fail(parts.join('/'), 'an offering cannot be nested inside another offering');
      offeringRoots.push({ directory, parts }); return;
    }
    for (const item of entries) {
      if (['course.json', 'offering.json'].includes(item.name)) continue;
      const segments = [...parts, item.name]; const full = path.join(directory, item.name);
      if (item.isDirectory()) await collect(full, segments, files, offeringRoots, offeringCollector);
      else if (item.isFile()) {
        const info = await stat(full);
        files.push({ name: item.name, folder: '', type: path.extname(item.name).slice(1).toUpperCase() || 'FILE', size: info.size, url: ['materials', ...segments].map(encodeURIComponent).join('/') });
        copies.push({ source: full, destination: path.join(target, ...segments) });
      }
    }
  }
  for (const { directory, parts } of roots) {
    const meta = await json(path.join(directory, 'course.json'));
    const id = string(meta.id, `${parts.join('/')}.id`);
    const title = string(meta.title, `${id}.title`);
    const description = meta.description === undefined ? '' : string(meta.description, `${id}.description`);
    const listings = array(meta.listings, `${id}.listings`).map((l) => {
      const departmentId = string(l?.departmentId, `${id}.listing.departmentId`);
      if (!departmentIds.has(departmentId)) fail(id, `unknown department ${departmentId}`);
      const code = string(l?.code, `${id}.listing.code`);
      const key = `${departmentId}\u0000${code.toLocaleLowerCase()}`;
      if (allListings.has(key)) fail(id, `duplicate department/code listing ${departmentId}: ${code}`);
      allListings.add(key); return { departmentId, code };
    });
    if (!listings.length) fail(id, 'at least one department/code listing is required');
    const courseMajors = array(meta.majorIds ?? [], `${id}.majorIds`).map((m) => string(m, `${id}.majorId`));
    unique(courseMajors, `${id}.majorIds`);
    for (const m of courseMajors) if (!majorIds.has(m)) fail(id, `unknown major ${m}`);
    const sharedFiles = []; const offeringRoots = [];
    await collect(directory, parts, sharedFiles, offeringRoots, true);
    // Keep relative subfolder labels useful without exposing the storage prefix.
    for (const file of sharedFiles) file.folder = decodeURIComponent(file.url.split('/').slice(1 + parts.length, -1).join('/'));
    const offerings = [];
    for (const offeringRoot of offeringRoots) {
      const item = await json(path.join(offeringRoot.directory, 'offering.json'));
      const offeringId = string(item.id, `${id}.offering.id`);
      const semesterId = string(item.semesterId, `${id}/${offeringId}.semesterId`);
      if (!semesterIds.has(semesterId)) fail(id, `unknown semester ${semesterId}`);
      const section = string(item.section, `${id}/${offeringId}.section`);
      const professorIds = array(item.professors, `${id}/${offeringId}.professors`).map((p) => {
        const professorId = string(p?.id, 'professor.id'); const name = string(p?.name, 'professor.name');
        if (professors.has(professorId) && professors.get(professorId).name !== name) fail(id, `conflicting names for professor ${professorId}`);
        professors.set(professorId, { id: professorId, name }); return professorId;
      });
      if (!professorIds.length && item.instructorsUnverified !== true) fail(id, `offering ${offeringId} requires at least one professor or instructorsUnverified: true`);
      unique(professorIds, `${id}/${offeringId}.professors`);
      const files = [];
      // Skip the root manifest, but reject any nested offering manifests.
      const entries = (await readdir(offeringRoot.directory, { withFileTypes: true })).filter(visible);
      const external = entries.some((e) => e.name === 'downloads.json' && e.isFile());
      if (external) await externalResources(offeringRoot.directory, files);
      for (const entry of entries) {
        if (entry.name === 'offering.json' || entry.name === 'downloads.json' || (external && entry.name === 'materials')) continue;
        if (entry.isDirectory()) await collect(path.join(offeringRoot.directory, entry.name), [...offeringRoot.parts, entry.name], files, [], false);
        else if (entry.isFile() && entry.name !== 'course.json') {
          const full = path.join(offeringRoot.directory, entry.name); const info = await stat(full);
          const segments = [...offeringRoot.parts, entry.name];
          files.push({ name: entry.name, folder: '', type: path.extname(entry.name).slice(1).toUpperCase() || 'FILE', size: info.size, url: ['materials', ...segments].map(encodeURIComponent).join('/') });
          copies.push({ source: full, destination: path.join(target, ...segments) });
        }
      }
      for (const file of files) if (!file.url.startsWith('https://')) file.folder = decodeURIComponent(file.url.split('/').slice(1 + offeringRoot.parts.length, -1).join('/'));
      files.sort((a, b) => compare(a.name, b.name) || compare(a.url, b.url));
      offerings.push({ id: offeringId, semesterId, section, professorIds, files });
    }
    unique(offerings.map((o) => o.id), `${id}.offerings`);
    unique(offerings.map((o) => `${o.semesterId}\u0000${o.section.toLocaleLowerCase()}`), `${id}.semester/section`);
    offerings.sort((a, b) => semesters.find((s) => s.id === b.semesterId).order - semesters.find((s) => s.id === a.semesterId).order || compare(a.section, b.section));
    sharedFiles.sort((a, b) => compare(a.name, b.name) || compare(a.url, b.url));
    courses.push({ id, title, description, listings, majorIds: courseMajors, sharedFiles, offerings });
  }
  unique(courses.map((c) => c.id), 'courses');
  courses.sort((a, b) => compare(a.title, b.title) || compare(a.id, b.id));
  departments.sort((a, b) => compare(a.name, b.name)); majors.sort((a, b) => compare(a.name, b.name)); semesters.sort((a, b) => b.order - a.order || compare(a.name, b.name));
  // Publish generated assets only after all relationships have been validated.
  await mkdir(path.join(root, 'public'), { recursive: true }); await rm(target, { recursive: true, force: true });
  for (const copy of copies) { await mkdir(path.dirname(copy.destination), { recursive: true }); await cp(copy.source, copy.destination); }
  const catalog = { departments, majors, semesters, professors: [...professors.values()].sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id)), courses };
  await writeFile(path.join(root, 'public/catalog.json'), JSON.stringify(catalog, null, 2) + '\n'); return catalog;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = await buildCatalog(process.cwd());
  console.log(`Indexed ${catalog.courses.length} courses, ${catalog.courses.reduce((n, c) => n + c.offerings.length, 0)} offerings.`);
}
