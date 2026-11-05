import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildCatalog } from './build-catalog.mjs';
import { fields, folders, inScope, normalizeSelection, searchFiles } from '../src/library.ts';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'course-library-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'courses', 'linear-algebra', 'Week 1'), { recursive: true });
  return root;
}

test('indexes nested files, preserves bytes, encodes URL segments and excludes hidden files and symlinks', async (t) => {
  const root = await fixture(t);
  const course = path.join(root, 'courses', 'linear-algebra');
  await writeFile(path.join(course, 'course.json'), JSON.stringify({ title: 'Linear Algebra', category: 'Mathematics' }));
  await writeFile(path.join(course, 'Week 1', 'Notes #1.pdf'), Buffer.from([1, 2, 3, 4]));
  await writeFile(path.join(course, '.secret'), 'hidden');
  await symlink(path.join(course, '.secret'), path.join(course, 'linked.txt'));
  const catalog = await buildCatalog(root);
  assert.equal(catalog.courses[0].course, 'Linear Algebra');
  assert.equal(catalog.courses[0].files.length, 1);
  assert.equal(catalog.courses[0].files[0].url, 'materials/linear-algebra/Week%201/Notes%20%231.pdf');
  assert.deepEqual(await readFile(path.join(root, 'public/materials/linear-algebra/Week 1/Notes #1.pdf')), Buffer.from([1, 2, 3, 4]));
  await rm(path.join(course, 'Week 1', 'Notes #1.pdf'));
  assert.equal((await buildCatalog(root)).courses[0].files.length, 0);
  await assert.rejects(readFile(path.join(root, 'public/materials/linear-algebra/Week 1/Notes #1.pdf')), { code: 'ENOENT' });
});

test('uses folder names when metadata is absent and rejects malformed metadata', async (t) => {
  const root = await fixture(t);
  assert.equal((await buildCatalog(root)).courses[0].course, 'Linear Algebra');
  await writeFile(path.join(root, 'courses/linear-algebra/course.json'), '{broken');
  await assert.rejects(buildCatalog(root), /Invalid course.json/);
  await writeFile(path.join(root, 'courses/linear-algebra/course.json'), '{"title":42}');
  await assert.rejects(buildCatalog(root), /title must be a non-empty string/);
});

test('indexes nested offerings, sorts all five fields, and navigates without mixing semesters or professors', async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, 'courses/linear-algebra'), { recursive: true });
  const metadata = [
    { department: 'Mathematics', course: 'Algebra', semester: 'Semester 2', professor: 'Professor B', courseCode: 'MA102' },
    { department: 'Mathematics', course: 'Algebra', semester: 'Semester 1', professor: 'Professor Z', courseCode: 'MA101' },
    { department: 'Mathematics', course: 'Algebra', semester: 'Semester 1', professor: 'Professor A', courseCode: 'MA102' },
    { department: 'Mathematics', course: 'Algebra', semester: 'Semester 1', professor: 'Professor A', courseCode: 'MA101' },
    { department: 'Computer Science', course: 'Algorithms', semester: 'Semester 1', professor: 'Professor C', courseCode: 'CS101' },
  ];
  for (const [index, meta] of metadata.entries()) {
    const parts = fields.map(({ key }) => meta[key]);
    const directory = path.join(root, 'courses', ...parts);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'course.json'), JSON.stringify(meta));
    await writeFile(path.join(directory, `Lecture ${index}.md`), `Material ${index}`);
  }
  const { courses } = await buildCatalog(root);
  assert.equal(courses.length, 5);
  assert.deepEqual(courses.map((course) => metadata.findIndex((meta) => fields.every(({ key }) => meta[key] === course[key]))), [4, 3, 2, 1, 0]);
  assert.deepEqual(folders(courses, []).map((folder) => folder.name), ['Computer Science', 'Mathematics']);
  assert.deepEqual(folders(courses, ['Mathematics', 'Algebra']).map((folder) => folder.name), ['Semester 1', 'Semester 2']);
  assert.deepEqual(folders(courses, ['Mathematics', 'Algebra', 'Semester 1']).map((folder) => folder.name), ['Professor A', 'Professor Z']);
  const selected = ['Mathematics', 'Algebra', 'Semester 1', 'Professor A', 'MA101'];
  assert.equal(inScope(courses, selected).length, 1);
  assert.equal(searchFiles(courses, selected, '', '').length, 1);
  assert.equal(searchFiles(courses, [], 'MA101 "Professor A"', '').length, 1);
  assert.equal(searchFiles(courses, ['Computer Science'], 'MA101', '').length, 0);
  assert.equal(searchFiles(courses, [], '', 'PDF').length, 0);
  assert.deepEqual(normalizeSelection(courses, ['Computer Science', 'Algebra', 'Semester 1']), ['Computer Science']);
  assert.deepEqual(normalizeSelection(courses, selected), selected);
  const resource = courses[0].files[0];
  assert.ok(resource.url.includes('Computer%20Science/Algorithms/Semester%201/Professor%20C/CS101/'));
  assert.equal(await readFile(path.join(root, 'public', decodeURIComponent(resource.url)), 'utf8'), 'Material 4');
});

test('rejects ambiguous nested manifests and non-object or blank metadata', async (t) => {
  const root = await fixture(t);
  const parent = path.join(root, 'courses/linear-algebra');
  await writeFile(path.join(parent, 'course.json'), '{}');
  await writeFile(path.join(parent, 'Week 1/course.json'), '{}');
  await assert.rejects(buildCatalog(root), /nested course.json/);
  await rm(path.join(parent, 'Week 1/course.json'));
  for (const value of ['null', '[]', '42']) {
    await writeFile(path.join(parent, 'course.json'), value);
    await assert.rejects(buildCatalog(root), /must contain an object/);
  }
  await writeFile(path.join(parent, 'course.json'), '{"department":"  "}');
  await assert.rejects(buildCatalog(root), /department must be a non-empty string/);
});
