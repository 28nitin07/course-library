import { readdir, readFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const titleFrom = (name) => name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export async function buildCatalog(root) {
  const source = path.join(root, 'courses');
  const target = path.join(root, 'public', 'materials');
  await mkdir(path.join(root, 'public'), { recursive: true });
  await rm(target, { recursive: true, force: true });
  const courses = [];
  for (const folder of (await readdir(source, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!folder.isDirectory() || folder.name.startsWith('.')) continue;
    const coursePath = path.join(source, folder.name);
    let meta = {};
    try { meta = JSON.parse(await readFile(path.join(coursePath, 'course.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error(`Invalid course.json in ${folder.name}: ${error.message}`); }
    for (const key of ['title', 'description', 'category']) {
      if (meta[key] !== undefined && typeof meta[key] !== 'string') throw new Error(`${folder.name}: ${key} must be a string`);
    }
    const files = [];
    async function walk(directory, parts = []) {
      for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        if (item.name.startsWith('.') || (parts.length === 0 && item.name === 'course.json')) continue;
        const segments = [...parts, item.name];
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) await walk(fullPath, segments);
        else if (item.isFile()) {
          const info = await stat(fullPath);
          const destination = path.join(target, folder.name, ...segments);
          await mkdir(path.dirname(destination), { recursive: true });
          await cp(fullPath, destination);
          files.push({ name: item.name, folder: parts.join('/'), type: path.extname(item.name).slice(1).toUpperCase() || 'FILE', size: info.size, url: ['materials', folder.name, ...segments].map(encodeURIComponent).join('/') });
        }
      }
    }
    await walk(coursePath);
    courses.push({ id: folder.name, title: meta.title || titleFrom(folder.name), description: meta.description || '', category: meta.category || 'Uncategorized', files });
  }
  const catalog = { courses };
  await import('node:fs/promises').then(({ writeFile }) => writeFile(path.join(root, 'public', 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n'));
  return catalog;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = await buildCatalog(process.cwd());
  console.log(`Indexed ${catalog.courses.length} courses and ${catalog.courses.reduce((n, c) => n + c.files.length, 0)} files.`);
}
