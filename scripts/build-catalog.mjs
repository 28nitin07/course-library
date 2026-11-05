import { readdir, readFile, mkdir, cp, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const hierarchy = ['department', 'course', 'semester', 'professor', 'courseCode'];
const compare = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
const titleFrom = (name) => name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const visible = (item) => !item.name.startsWith('.') && !item.isSymbolicLink();

export async function buildCatalog(root) {
  const source = path.join(root, 'courses');
  const target = path.join(root, 'public', 'materials');
  const roots = [];
  async function discover(directory, parts) {
    const entries = (await readdir(directory, { withFileTypes: true })).filter(visible).sort((a, b) => compare(a.name, b.name));
    const manifest = entries.find((item) => item.isFile() && item.name === 'course.json');
    const children = [];
    for (const item of entries.filter((item) => item.isDirectory())) children.push(...await discover(path.join(directory, item.name), [...parts, item.name]));
    if (manifest && children.length) throw new Error(`${parts.join('/')}: nested course.json files are ambiguous. Put each offering in a separate leaf folder.`);
    return manifest ? [{ parts, directory, manifest: true }] : children;
  }
  for (const folder of (await readdir(source, { withFileTypes: true })).filter(visible).sort((a, b) => compare(a.name, b.name))) {
    if (!folder.isDirectory()) continue;
    const directory = path.join(source, folder.name);
    const discovered = await discover(directory, [folder.name]);
    roots.push(...(discovered.length ? discovered : [{ parts: [folder.name], directory, manifest: false }]));
  }
  const courses = [];
  const copies = [];
  for (const offering of roots) {
    const id = offering.parts.join('/');
    let meta = {};
    if (offering.manifest) {
      try { meta = JSON.parse(await readFile(path.join(offering.directory, 'course.json'), 'utf8')); }
      catch (error) { throw new Error(`Invalid course.json in ${id}: ${error.message}`); }
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error(`${id}: course.json must contain an object`);
      for (const key of [...hierarchy, 'title', 'description', 'category']) {
        if (meta[key] !== undefined && (typeof meta[key] !== 'string' || !meta[key].trim())) throw new Error(`${id}: ${key} must be a non-empty string`);
      }
    }
    const value = (key, fallback) => meta[key]?.trim() || fallback;
    const course = {
      id,
      department: value('department', value('category', 'Unassigned department')),
      course: value('course', value('title', titleFrom(offering.parts.at(-1)))),
      semester: value('semester', 'Not specified'),
      professor: value('professor', 'Not specified'),
      courseCode: value('courseCode', 'Not specified'),
      description: value('description', ''),
      files: [],
    };
    async function walk(directory, parts = []) {
      for (const item of (await readdir(directory, { withFileTypes: true })).filter(visible).sort((a, b) => compare(a.name, b.name))) {
        if (item.name === 'course.json') continue;
        const segments = [...parts, item.name];
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) await walk(fullPath, segments);
        else if (item.isFile()) {
          const info = await stat(fullPath);
          const destination = path.join(target, ...offering.parts, ...segments);
          copies.push({ source: fullPath, destination });
          course.files.push({ name: item.name, folder: parts.join('/'), type: path.extname(item.name).slice(1).toUpperCase() || 'FILE', size: info.size, url: ['materials', ...offering.parts, ...segments].map(encodeURIComponent).join('/') });
        }
      }
    }
    await walk(offering.directory);
    courses.push(course);
  }
  courses.sort((a, b) => {
    for (const key of hierarchy) { const result = compare(a[key], b[key]); if (result) return result; }
    return compare(a.id, b.id);
  });
  // Validate every offering before replacing generated public assets.
  await mkdir(path.join(root, 'public'), { recursive: true });
  await rm(target, { recursive: true, force: true });
  for (const copy of copies) {
    await mkdir(path.dirname(copy.destination), { recursive: true });
    await cp(copy.source, copy.destination);
  }
  const catalog = { courses };
  await writeFile(path.join(root, 'public', 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  return catalog;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = await buildCatalog(process.cwd());
  console.log(`Indexed ${catalog.courses.length} offerings and ${catalog.courses.reduce((n, c) => n + c.files.length, 0)} files.`);
}
