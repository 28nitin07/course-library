import type { Course } from './catalog';

export const fields = [
  { key: 'department', label: 'Department' },
  { key: 'course', label: 'Course' },
  { key: 'semester', label: 'Semester' },
  { key: 'professor', label: 'Professor' },
  { key: 'courseCode', label: 'Course code' },
] as const;
export const compare = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
export function inScope(courses: readonly Course[], selection: readonly string[]) {
  return courses.filter((course) => selection.every((value, index) => course[fields[index].key] === value));
}
export function normalizeSelection(courses: readonly Course[], selection: readonly string[]) {
  const result: string[] = [];
  for (const value of selection.slice(0, fields.length)) {
    if (!value || !inScope(courses, [...result, value]).length) break;
    result.push(value);
  }
  return result;
}
export function folders(courses: readonly Course[], selection: readonly string[]) {
  const field = fields[selection.length];
  if (!field) return [];
  const scope = inScope(courses, selection);
  return [...new Set(scope.map((course) => course[field.key]))].sort(compare).map((name) => {
    const offerings = scope.filter((course) => course[field.key] === name);
    return { name, offerings: offerings.length, files: offerings.reduce((sum, course) => sum + course.files.length, 0) };
  });
}
export function searchFiles(courses: readonly Course[], selection: readonly string[], query: string, type: string) {
  const terms = (query.toLocaleLowerCase().match(/"[^"]+"|\S+/g) || []).map((term) => term.replace(/^"|"$/g, ''));
  return inScope(courses, selection).flatMap((course) => course.files.map((file) => ({ course, file }))).filter(({ course, file }) => {
    const searchable = [...fields.map(({ key }) => course[key]), course.description, file.name, file.folder].join(' ').toLocaleLowerCase();
    return (!type || file.type === type) && terms.every((term) => searchable.includes(term));
  });
}
