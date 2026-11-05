import type { Catalog, Course, Offering } from './catalog';
export const compare = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
export type Filters = { department: string; major: string; semester: string; professor: string; query: string };
export type State = Filters & { course: string; offering: string };
export const emptyState = (): State => ({ department: '', major: '', semester: '', professor: '', query: '', course: '', offering: '' });
export function courseInScope(course: Course, filters: Filters) {
  return (!filters.department || course.listings.some((l) => l.departmentId === filters.department)) && (!filters.major || course.majorIds.includes(filters.major));
}
export function offeringInScope(offering: Offering, filters: Filters) {
  return (!filters.semester || offering.semesterId === filters.semester) && (!filters.professor || offering.professorIds.includes(filters.professor));
}
const tokens = (query: string) => (query.toLocaleLowerCase().match(/"[^"]+"|\S+/g) || []).map((t) => t.replace(/^"|"$/g, ''));
export function courseText(catalog: Catalog, course: Course) {
  return [course.title, course.description, ...course.listings.flatMap((l) => [l.code, catalog.departments.find((d) => d.id === l.departmentId)?.name || '']), ...course.majorIds.map((id) => catalog.majors.find((m) => m.id === id)?.name || '')].join(' ');
}
export function offeringText(catalog: Catalog, offering: Offering) {
  return [offering.section, catalog.semesters.find((s) => s.id === offering.semesterId)?.name || '', ...offering.professorIds.map((id) => catalog.professors.find((p) => p.id === id)?.name || '')].join(' ');
}
export function matches(text: string, query: string) { const lower = text.toLocaleLowerCase(); return tokens(query).every((t) => lower.includes(t)); }
export function matchingOfferings(catalog: Catalog, course: Course, filters: Filters) {
  return course.offerings.filter((offering) => offeringInScope(offering, filters) && matches([courseText(catalog, course), offeringText(catalog, offering), ...offering.files.map((f) => `${f.name} ${f.folder}`)].join(' '), filters.query));
}
export function matchingCourses(catalog: Catalog, filters: Filters) {
  return catalog.courses.filter((course) => {
    if (!courseInScope(course, filters)) return false;
    if (matchingOfferings(catalog, course, filters).length) return true;
    if (filters.semester || filters.professor) return false;
    return matches([courseText(catalog, course), ...course.sharedFiles.map((f) => `${f.name} ${f.folder}`)].join(' '), filters.query);
  });
}
export function normalizeState(catalog: Catalog, value: State): State {
  const result = { ...value };
  for (const [key, entities] of [['department', catalog.departments], ['major', catalog.majors], ['semester', catalog.semesters], ['professor', catalog.professors]] as const) if (!entities.some((e) => e.id === result[key])) result[key] = '';
  const course = catalog.courses.find((c) => c.id === result.course && courseInScope(c, result));
  if (!course) { result.course = ''; result.offering = ''; }
  else if (!course.offerings.some((o) => o.id === result.offering && offeringInScope(o, result))) result.offering = '';
  return result;
}
export const fileCount = (course: Course) => course.sharedFiles.length + course.offerings.reduce((n, o) => n + o.files.length, 0);
export function departmentCounts(catalog: Catalog, filters: Filters) {
  const counts = new Map<string, number>();
  for (const course of matchingCourses(catalog, { ...filters, department: '' })) {
    for (const departmentId of new Set(course.listings.map((l) => l.departmentId))) counts.set(departmentId, (counts.get(departmentId) || 0) + 1);
  }
  return catalog.departments.map((department) => ({ ...department, count: counts.get(department.id) || 0 }));
}
