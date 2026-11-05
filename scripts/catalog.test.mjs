import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildCatalog } from './build-catalog.mjs';
import { emptyState, matchingCourses, matchingOfferings, normalizeState, departmentCounts, fileCount } from '../src/library.ts';

const config = () => ({
  departments: Array.from({ length: 24 }, (_, i) => ({ id: `dept-${i}`, name: `Department ${i + 1}` })),
  majors: Array.from({ length: 24 }, (_, i) => ({ id: `major-${i}`, name: `Major ${i + 1}` })),
  semesters: [{ id: 'fall-26', name: 'Fall 2026', order: 20263 }, { id: 'spring-26', name: 'Spring 2026', order: 20261 }],
});
const courseMeta = () => ({ id: 'linear-algebra', title: 'Linear Algebra', description: 'Matrices and vector spaces.', listings: [{ departmentId: 'dept-0', code: 'MATH 201' }, { departmentId: 'dept-1', code: 'CS 201' }], majorIds: ['major-0', 'major-1'] });
const offeringMeta = (id, semesterId, section, professors) => ({ id, semesterId, section, professors: professors.map(([id, name]) => ({ id, name })) });
async function put(root, name, value) { const file = path.join(root, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)); }
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'university-archive-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(root, 'catalog.config.json', config());
  await put(root, 'courses/algebra/course.json', courseMeta());
  await put(root, 'courses/algebra/shared/Reading #1.md', 'Shared reading');
  const offerings = [
    offeringMeta('fall-a', 'fall-26', 'Section A', [['ada', 'Ada Rao']]),
    offeringMeta('fall-b', 'fall-26', 'Section B', [['ben', 'Ben Sen']]),
    offeringMeta('fall-team', 'fall-26', 'Section C', [['ada', 'Ada Rao'], ['ben', 'Ben Sen']]),
    offeringMeta('spring-a', 'spring-26', 'Section A', [['chris', 'Chris Das']]),
  ];
  for (const item of offerings) {
    await put(root, `courses/algebra/offerings/${item.id}/offering.json`, item);
    await put(root, `courses/algebra/offerings/${item.id}/Week 1/Notes #1.md`, `Private to ${item.id}`);
  }
  return root;
}
const filters = (overrides = {}) => ({ ...emptyState(), ...overrides });

test('cross-listing keeps one canonical course, one set of files, and correct counts in both departments', async (t) => {
  const root = await fixture(t); const catalog = await buildCatalog(root);
  assert.equal(catalog.courses.length, 1);
  for (const department of ['dept-0', 'dept-1']) assert.equal(matchingCourses(catalog, filters({ department })).length, 1);
  for (const query of ['MATH 201', 'CS 201']) assert.equal(matchingCourses(catalog, filters({ query })).length, 1);
  assert.equal(matchingCourses(catalog, filters()).length, 1);
  assert.equal(departmentCounts(catalog, filters()).find((d) => d.id === 'dept-0').count, 1);
  assert.equal(departmentCounts(catalog, filters()).find((d) => d.id === 'dept-1').count, 1);
  assert.equal(fileCount(catalog.courses[0]), 5);
  assert.equal(catalog.courses[0].sharedFiles.length, 1);
  assert.equal(catalog.courses[0].offerings.length, 4);
  assert.ok(catalog.courses[0].sharedFiles[0].url.includes('shared/Reading%20%231.md'));
});

test('parallel sections, team teaching, and semester-specific faculty retain exact offering/file associations', async (t) => {
  const root = await fixture(t); const catalog = await buildCatalog(root); const course = catalog.courses[0];
  assert.deepEqual(matchingOfferings(catalog, course, filters({ semester: 'fall-26' })).map((o) => o.id), ['fall-a', 'fall-b', 'fall-team']);
  assert.deepEqual(matchingOfferings(catalog, course, filters({ semester: 'fall-26', professor: 'ada' })).map((o) => o.id), ['fall-a', 'fall-team']);
  assert.deepEqual(matchingOfferings(catalog, course, filters({ semester: 'spring-26', professor: 'ada' })), []);
  assert.deepEqual(matchingOfferings(catalog, course, filters({ professor: 'chris' })).map((o) => o.id), ['spring-a']);
  assert.deepEqual(matchingOfferings(catalog, course, filters({ query: '"Ada Rao" "Ben Sen"' })).map((o) => o.id), ['fall-team']);
  assert.equal(matchingCourses(catalog, filters({ semester: 'spring-26', professor: 'ada' })).length, 0);
  for (const offering of course.offerings) {
    assert.equal(offering.files.length, 1);
    assert.equal(offering.files[0].folder, 'Week 1');
    assert.equal(await readFile(path.join(root, 'public', decodeURIComponent(offering.files[0].url)), 'utf8'), `Private to ${offering.id}`);
    assert.ok(!offering.files.some((f) => f.name.startsWith('Reading')));
  }
});

test('major membership is independent of departments and scales beyond 20 programs', async (t) => {
  const root = await fixture(t); const catalog = await buildCatalog(root);
  assert.equal(catalog.majors.length, 24); assert.equal(catalog.departments.length, 24);
  assert.equal(matchingCourses(catalog, filters({ major: 'major-1', department: 'dept-0' })).length, 1);
  assert.equal(matchingCourses(catalog, filters({ major: 'major-2', department: 'dept-0' })).length, 0);
  assert.equal(departmentCounts(catalog, filters({ major: 'major-1' })).length, 24);
  assert.equal(matchingCourses(catalog, filters({ department: 'dept-23' })).length, 0);
});

test('stable IDs distinguish same-title courses and same-name professors', async (t) => {
  const root = await fixture(t);
  await put(root, 'courses/other/course.json', { ...courseMeta(), id: 'other-algebra', listings: [{ departmentId: 'dept-2', code: 'LA 101' }] });
  await put(root, 'courses/other/term/offering.json', offeringMeta('fall-a', 'fall-26', 'Section A', [['ada-other', 'Ada Rao']]));
  const catalog = await buildCatalog(root);
  assert.equal(matchingCourses(catalog, filters({ query: 'Linear Algebra' })).length, 2);
  assert.equal(matchingCourses(catalog, filters({ professor: 'ada-other' }))[0].id, 'other-algebra');
  assert.equal(matchingCourses(catalog, filters({ professor: 'ada' }))[0].id, 'linear-algebra');
});

test('URL state rejects impossible offering/course combinations and clears invalid references', async (t) => {
  const root = await fixture(t); const catalog = await buildCatalog(root);
  assert.equal(normalizeState(catalog, filters({ course: 'linear-algebra', offering: 'fall-a', semester: 'spring-26' })).offering, '');
  assert.equal(normalizeState(catalog, filters({ course: 'linear-algebra', offering: 'fall-a', professor: 'ben' })).offering, '');
  assert.equal(normalizeState(catalog, filters({ course: 'linear-algebra', offering: 'fall-team', professor: 'ben' })).offering, 'fall-team');
  const invalid = normalizeState(catalog, filters({ course: 'linear-algebra', offering: 'fall-a', department: 'dept-23' }));
  assert.equal(invalid.course, ''); assert.equal(invalid.offering, '');
  assert.deepEqual(normalizeState(catalog, filters({ course: 'unknown', offering: 'fall-a', professor: 'missing', major: 'missing', semester: 'missing' })), emptyState());
});

test('shared materials work without any offerings, but cannot masquerade as semester/instructor files', async (t) => {
  const root = await fixture(t); await rm(path.join(root, 'courses/algebra/offerings'), { recursive: true });
  const catalog = await buildCatalog(root);
  assert.equal(matchingCourses(catalog, filters({ query: 'Reading' })).length, 1);
  assert.equal(matchingCourses(catalog, filters({ semester: 'fall-26' })).length, 0);
  assert.equal(catalog.courses[0].offerings.length, 0);
});

test('hidden files, symlinks, manifests, and stale files are excluded while exact file bytes survive', async (t) => {
  const root = await fixture(t); const file = 'courses/algebra/offerings/fall-a/Bytes #2.pdf';
  await put(root, file, Buffer.from([0, 1, 255]));
  await put(root, 'courses/algebra/.secret', 'hidden');
  await put(root, 'courses/algebra/.hidden/leak.md', 'hidden');
  await symlink(path.join(root, 'courses/algebra/.secret'), path.join(root, 'courses/algebra/link.md'));
  let catalog = await buildCatalog(root);
  const bytes = catalog.courses[0].offerings.find((o) => o.id === 'fall-a').files.find((f) => f.name === 'Bytes #2.pdf');
  assert.deepEqual(await readFile(path.join(root, 'public', decodeURIComponent(bytes.url))), Buffer.from([0, 1, 255]));
  assert.equal(catalog.courses[0].sharedFiles.length, 1);
  await rm(path.join(root, file)); catalog = await buildCatalog(root);
  await assert.rejects(readFile(path.join(root, 'public', decodeURIComponent(bytes.url))), { code: 'ENOENT' });
});

test('invalid relationships fail before replacing a previously generated catalog', async (t) => {
  const root = await fixture(t); await buildCatalog(root);
  const before = await readFile(path.join(root, 'public/catalog.json'), 'utf8');
  for (const [field, value, pattern] of [
    ['listings', [{ departmentId: 'missing', code: 'M1' }], /unknown department/],
    ['majorIds', ['missing'], /unknown major/],
    ['id', '', /non-empty string/],
    ['listings', [], /at least one/],
  ]) {
    await put(root, 'courses/algebra/course.json', { ...courseMeta(), [field]: value });
    await assert.rejects(buildCatalog(root), pattern);
    assert.equal(await readFile(path.join(root, 'public/catalog.json'), 'utf8'), before);
  }
});

test('duplicate course/listing/offering/section identities and conflicting professor names are rejected', async (t) => {
  const root = await fixture(t);
  await put(root, 'courses/duplicate/course.json', { ...courseMeta(), id: 'duplicate' });
  await assert.rejects(buildCatalog(root), /duplicate department\/code/);
  await put(root, 'courses/duplicate/course.json', { ...courseMeta(), listings: [{ departmentId: 'dept-4', code: 'OTHER' }] });
  await assert.rejects(buildCatalog(root), /courses: duplicate value/);
  await rm(path.join(root, 'courses/duplicate'), { recursive: true });
  const location = 'courses/algebra/offerings/fall-b/offering.json';
  for (const [value, pattern] of [
    [offeringMeta('fall-a', 'fall-26', 'Section B', [['ben', 'Ben Sen']]), /offerings: duplicate/],
    [offeringMeta('fall-b', 'fall-26', 'Section A', [['ben', 'Ben Sen']]), /semester\/section: duplicate/],
    [offeringMeta('fall-b', 'fall-26', 'Section B', [['ada', 'Wrong Name']]), /conflicting names/],
    [offeringMeta('fall-b', 'unknown', 'Section B', [['ben', 'Ben Sen']]), /unknown semester/],
    [offeringMeta('fall-b', 'fall-26', 'Section B', []), /at least one professor/],
  ]) { await put(root, location, value); await assert.rejects(buildCatalog(root), pattern); }
});

test('orphan offerings, nested courses/offerings and malformed manifests are rejected', async (t) => {
  const root = await fixture(t);
  await put(root, 'courses/orphan/offering.json', {}); await assert.rejects(buildCatalog(root), /must be inside a course/); await rm(path.join(root, 'courses/orphan'), { recursive: true });
  await put(root, 'courses/algebra/nested/course.json', courseMeta()); await assert.rejects(buildCatalog(root), /cannot be nested/); await rm(path.join(root, 'courses/algebra/nested'), { recursive: true });
  await put(root, 'courses/algebra/offerings/fall-a/nested/offering.json', {}); await assert.rejects(buildCatalog(root), /offering cannot be nested/); await rm(path.join(root, 'courses/algebra/offerings/fall-a/nested'), { recursive: true });
  for (const value of ['null', '[]', '{broken']) { await put(root, 'courses/algebra/course.json', value); await assert.rejects(buildCatalog(root), /must contain an object|invalid JSON/); }
});

test('external LFS materials keep byte pointers out of Pages and retain release backups', async (t) => {
  const root = await fixture(t);
  const folder = 'courses/algebra/offerings/fall-a';
  await put(root, `${folder}/materials/Large.pdf`, 'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 400000000');
  const file = { name: 'Large.pdf', folder: 'Lectures', type: 'PDF', size: 400000000, url: 'https://media.githubusercontent.com/media/owner/repo/main/Large.pdf', backupUrl: 'https://github.com/owner/repo/releases/download/materials/Large.pdf' };
  await put(root, `${folder}/downloads.json`, { files: [file] });
  const catalog = await buildCatalog(root);
  const offering = catalog.courses[0].offerings.find((o) => o.id === 'fall-a');
  assert.deepEqual(offering.files.find((f) => f.name === 'Large.pdf'), file);
  await assert.rejects(readFile(path.join(root, 'public/materials/algebra/offerings/fall-a/materials/Large.pdf')), { code: 'ENOENT' });
  assert.ok(!offering.files.some((f) => f.name === 'downloads.json'));
  for (const url of ['javascript:alert(1)', 'https://untrusted.example/file', 'https://github.com@untrusted.example/file']) {
    await put(root, `${folder}/downloads.json`, { files: [{ ...file, url }] });
    await assert.rejects(buildCatalog(root), /HTTPS GitHub/);
  }
});

test('unverified instructors are explicit and never become a fake faculty filter', async (t) => {
  const root = await fixture(t);
  await put(root, 'courses/algebra/offerings/fall-a/offering.json', { ...offeringMeta('fall-a', 'fall-26', 'Section A', []), instructorsUnverified: true });
  const catalog = await buildCatalog(root);
  assert.deepEqual(catalog.courses[0].offerings.find((o) => o.id === 'fall-a').professorIds, []);
  assert.equal(matchingOfferings(catalog, catalog.courses[0], filters({ professor: 'ada' })).some((o) => o.id === 'fall-a'), false);
});

test('downloads switch to Releases when LFS is quota-blocked, unavailable, or unreachable', async () => {
  const { downloadDestination } = await import('../src/downloads.ts');
  for (const status of [403, 404, 429, 500]) assert.equal(await downloadDestination('https://primary', 'https://backup', async () => new Response(null, { status })), 'https://backup');
  assert.equal(await downloadDestination('https://primary', 'https://backup', async () => { throw new TypeError('Network unavailable'); }), 'https://backup');
  assert.equal(await downloadDestination('https://primary', 'https://backup', async (_url, options) => { assert.equal(options.method, 'HEAD'); return new Response(null, { status: 200 }); }), 'https://primary');
});
