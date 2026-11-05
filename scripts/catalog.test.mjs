import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildCatalog } from './build-catalog.mjs';

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
  assert.equal(catalog.courses[0].title, 'Linear Algebra');
  assert.equal(catalog.courses[0].files.length, 1);
  assert.equal(catalog.courses[0].files[0].url, 'materials/linear-algebra/Week%201/Notes%20%231.pdf');
  assert.deepEqual(await readFile(path.join(root, 'public/materials/linear-algebra/Week 1/Notes #1.pdf')), Buffer.from([1, 2, 3, 4]));
  await rm(path.join(course, 'Week 1', 'Notes #1.pdf'));
  assert.equal((await buildCatalog(root)).courses[0].files.length, 0);
  await assert.rejects(readFile(path.join(root, 'public/materials/linear-algebra/Week 1/Notes #1.pdf')), { code: 'ENOENT' });
});

test('uses folder names when metadata is absent and rejects malformed metadata', async (t) => {
  const root = await fixture(t);
  assert.equal((await buildCatalog(root)).courses[0].title, 'Linear Algebra');
  await writeFile(path.join(root, 'courses/linear-algebra/course.json'), '{broken');
  await assert.rejects(buildCatalog(root), /Invalid course.json/);
  await writeFile(path.join(root, 'courses/linear-algebra/course.json'), '{"title":42}');
  await assert.rejects(buildCatalog(root), /title must be a string/);
});
