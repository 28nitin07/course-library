import { Effect } from 'effect';
import { createIcons, FileText, Download, Search, ArrowLeft, ChevronRight, Library, Users, ExternalLink, Moon } from 'lucide';
import { loadCatalog, type Catalog, type Course, type Offering, type Resource } from './catalog';
import { emptyState, normalizeState, matchingCourses, matchingOfferings, offeringText, courseText, matches, fileCount, compare, type State } from './library';
import './style.css';
import { setupTheme } from './theme';

const icons = { FileText, Download, Search, ArrowLeft, ChevronRight, Library, Users, ExternalLink, Moon };
const icon = (name: keyof typeof icons) => `<i data-lucide="${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}" aria-hidden="true"></i>`;
const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const size = (n: number) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const keys = ['department', 'major', 'semester', 'professor', 'query', 'course', 'offering'] as const;
let catalog: Catalog;
let state = emptyState();
let fileType = '';
let ready = false;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<div class="archive-shell"><header class="site-header"><a class="identity" href="./"><span aria-hidden="true">&gt;_</span>course-library</a><nav class="header-actions" aria-label="Archive navigation"><button id="home">courses</button><a href="https://github.com/28nitin07/course-library" target="_blank" rel="noopener">source ${icon('ExternalLink')}</a><button id="help-toggle" aria-controls="help" aria-expanded="false" aria-label="How the archive works">help</button><button id="theme-toggle" class="theme-toggle" type="button" aria-label="Dark mode" aria-pressed="true">${icon('Moon')}dark</button></nav></header><section id="help" hidden><h2>Using the archive</h2><p>Search a course title, any cross-listed code, an instructor, or a filename. Use the filters to narrow the results.</p><p>Each course has one home. Open a course to compare semester offerings, sections, and instructors. Shared materials are labeled separately from offering files.</p></section><div class="find-bar"><label for="search"><span aria-hidden="true">&gt;</span><span class="sr-only">Search the archive</span></label><input id="search" name="search" type="search" placeholder="Search courses, codes, instructors, files…" autocomplete="off"><kbd>/</kbd></div><div class="layout"><main id="main" tabindex="-1"><nav id="breadcrumbs" aria-label="Breadcrumb"></nav><div class="page-heading"><div><h1 id="page-title">All courses</h1><p id="page-description"></p></div><div id="archive-counts" class="archive-counts"></div></div><div id="content" aria-live="polite"><div class="empty" role="status"><h2>Loading catalog…</h2></div></div></main><aside class="filter-rail" aria-label="Course filters"><details id="filter-panel" open><summary>Filters<span aria-hidden="true">+/−</span></summary><div class="filter-body"><div id="filters" class="filters"></div><div id="offering-file-filter"></div><div id="active-filters" class="active-filters"></div></div></details></aside></div><footer class="statusbar"><span id="status" role="status">Loading catalog…</span><span>public / read-only</span></footer></div>`;
setupTheme();
if (window.matchMedia('(max-width: 760px)').matches) document.querySelector<HTMLDetailsElement>('#filter-panel')!.open = false;
const search = document.querySelector<HTMLInputElement>('#search')!;
function paintIcons() { createIcons({ icons }); }
function readURL() {
  const params = new URLSearchParams(location.hash.slice(1)); const value = emptyState();
  keys.forEach((key) => { value[key] = params.get(key === 'query' ? 'q' : key) || ''; });
  // Recover earlier guide links while moving to stable course IDs.
  if (['Getting started', 'getting-started'].includes(value.course)) value.course = 'library-guide';
  state = normalizeState(catalog, value);
}
function syncURL(replace = false) {
  const params = new URLSearchParams(); keys.forEach((key) => { if (state[key]) params.set(key === 'query' ? 'q' : key, state[key]); });
  const url = `${location.pathname}${location.search}${params.size ? '#' + params : ''}`;
  if (url !== `${location.pathname}${location.search}${location.hash}`) history[replace ? 'replaceState' : 'pushState'](null, '', url);
}
function update(patch: Partial<State>, replace = false) {
  state = normalizeState(catalog, { ...state, ...patch }); fileType = ''; syncURL(replace); render();
}
const entity = (items: readonly { id: string; name: string }[], id: string) => items.find((item) => item.id === id)?.name || id;
function professorName(id: string) {
  const name = entity(catalog.professors, id);
  return catalog.professors.filter((p) => p.name === name).length > 1 ? `${name} (${id})` : name;
}
function courseCodes(course: Course) {
  return [...course.listings].sort((a, b) => (Number(b.departmentId === state.department) - Number(a.departmentId === state.department) || compare(a.code, b.code))).map((l) => `<span class="code" title="${esc(entity(catalog.departments, l.departmentId))}">${esc(l.code)}</span>`).join('');
}
function listingNames(course: Course) { return [...new Set(course.listings.map((l) => entity(catalog.departments, l.departmentId)))].join(' · '); }
function select(label: string, key: 'department' | 'major' | 'semester' | 'professor', items: readonly { id: string; name: string }[]) {
  const all = key === 'professor' ? 'All instructors' : `All ${label.toLowerCase()}s`;
  return `<label class="filter-field"><span>${label}</span><select data-filter="${key}" aria-label="${label}"><option value="">${all}</option>${items.map((item) => `<option value="${esc(item.id)}" ${state[key] === item.id ? 'selected' : ''}>${esc(key === 'professor' ? professorName(item.id) : item.name)}</option>`).join('')}</select></label>`;
}
function renderFilters() {
  document.querySelector('#filters')!.innerHTML = select('Department', 'department', catalog.departments) + select('Major', 'major', catalog.majors) + select('Semester', 'semester', catalog.semesters) + select('Instructor', 'professor', catalog.professors);
  document.querySelectorAll<HTMLSelectElement>('[data-filter]').forEach((control) => control.addEventListener('change', () => {
    const key = control.dataset.filter as 'department' | 'major' | 'semester' | 'professor';
    update({ [key]: control.value, offering: '' });
    document.querySelector<HTMLSelectElement>(`[data-filter="${key}"]`)?.focus();
  }));
  const labels = [['department', catalog.departments], ['major', catalog.majors], ['semester', catalog.semesters], ['professor', catalog.professors]] as const;
  document.querySelector('#active-filters')!.innerHTML = labels.filter(([key]) => state[key]).map(([key, items]) => `<button class="filter-chip" data-remove="${key}" aria-label="Remove ${key} filter: ${esc(entity(items, state[key]))}">${esc(entity(items, state[key]))}<span aria-hidden="true">×</span></button>`).join('') + (labels.some(([key]) => state[key]) || state.query ? '<button id="reset-filters" class="reset">Clear filters</button>' : '');
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((button) => button.addEventListener('click', () => update({ [button.dataset.remove!]: '', offering: '' })));
  document.querySelector('#reset-filters')?.addEventListener('click', () => update({ department: '', major: '', semester: '', professor: '', query: '', offering: '' }));
}
function renderBreadcrumbs(course?: Course, offering?: Offering) {
  document.querySelector('#breadcrumbs')!.innerHTML = `<button data-breadcrumb="home">Archive</button>${state.department ? `${icon('ChevronRight')}<button data-breadcrumb="department">${esc(entity(catalog.departments, state.department))}</button>` : ''}${course ? `${icon('ChevronRight')}<button data-breadcrumb="course">${esc(course.title)}</button>` : ''}${offering ? `${icon('ChevronRight')}<span aria-current="page">${esc(entity(catalog.semesters, offering.semesterId))} · ${esc(offering.section)}</span>` : ''}`;
  document.querySelector('[data-breadcrumb="home"]')!.addEventListener('click', () => { state = emptyState(); syncURL(); render(); });
  document.querySelector('[data-breadcrumb="department"]')?.addEventListener('click', () => update({ course: '', offering: '' }));
  document.querySelector('[data-breadcrumb="course"]')?.addEventListener('click', () => update({ offering: '' }));
}
function resourceTable(files: readonly Resource[], label: string, emptyMessage = 'No materials have been added here yet.') {
  if (!files.length) return `<div class="empty compact"><p>${esc(emptyMessage)}</p></div>`;
  return `<div class="table-scroll"><table class="file-table"><caption class="sr-only">${esc(label)}</caption><thead><tr><th scope="col">File</th><th scope="col">Type</th><th scope="col">Size</th><th scope="col"><span class="sr-only">Download</span></th></tr></thead><tbody>${files.map((file) => `<tr><td><div class="file-name">${icon('FileText')}<div><a href="${esc(file.url)}" target="_blank" rel="noopener">${esc(file.name)}</a>${file.folder ? `<small>${esc(file.folder)}</small>` : ''}</div></div></td><td>${esc(file.type)}</td><td class="size">${size(file.size)}</td><td><a class="download" href="${esc(file.url)}" download="${esc(file.name)}" aria-label="Download ${esc(file.name)}">${icon('Download')}<span>Download</span></a></td></tr>`).join('')}</tbody></table></div>`;
}
function bindCourseButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-course]').forEach((button) => button.addEventListener('click', () => { update({ course: button.dataset.course!, offering: '' }); document.querySelector<HTMLElement>('#main')!.focus(); }));
}
function renderCourseList() {
  const result = matchingCourses(catalog, state);
  document.querySelector('#page-title')!.textContent = state.department ? entity(catalog.departments, state.department) : 'All courses';
  document.querySelector('#page-description')!.textContent = '';
  const offerings = result.reduce((n, c) => n + matchingOfferings(catalog, c, state).length, 0);
  document.querySelector('#archive-counts')!.innerHTML = `<strong>${result.length}</strong><span>${result.length === 1 ? 'course' : 'courses'}</span>`;
  document.querySelector('#content')!.innerHTML = `<div class="section-heading"><h2>Course directory</h2><span>${offerings} matching ${offerings === 1 ? 'offering' : 'offerings'}</span></div>${result.length ? `<div class="table-scroll"><table class="course-table"><caption class="sr-only">Courses listed once, including cross-listed department codes</caption><thead><tr><th scope="col">Course</th><th scope="col">Listings</th><th scope="col">Offerings</th><th scope="col">Total files</th></tr></thead><tbody>${result.map((course) => {
    const available = matchingOfferings(catalog, course, state);
    const terms = [...new Set(available.map((o) => o.semesterId))].map((id) => entity(catalog.semesters, id));
    return `<tr><td><div class="course-name"><div><button data-course="${esc(course.id)}">${esc(course.title)}</button><small>${esc(listingNames(course))}</small></div></div></td><td><div class="codes">${courseCodes(course)}</div>${course.listings.length > 1 ? '<small class="cross-listed">Cross-listed</small>' : ''}</td><td><span>${available.length} ${available.length === 1 ? 'offering' : 'offerings'}</span><small>${esc(terms.join(' · ') || (course.sharedFiles.length ? 'Shared materials only' : 'No offerings yet'))}</small></td><td><span class="material-count">${fileCount(course)} ${fileCount(course) === 1 ? 'file' : 'files'}</span><button class="open-course" data-course="${esc(course.id)}" aria-label="Open ${esc(course.title)}">${icon('ChevronRight')}</button></td></tr>`;
  }).join('')}</tbody></table></div>` : `<div class="empty">${icon('Search')}<h2>No courses match these filters</h2><p>Try another department or clear the filters to search the whole archive.</p><button id="empty-reset" class="action-button">Clear all filters</button></div>`}`;
  document.querySelector('#empty-reset')?.addEventListener('click', () => { state = emptyState(); syncURL(); render(); });
  bindCourseButtons();
  document.querySelector('#status')!.textContent = `${result.length} ${result.length === 1 ? 'course' : 'courses'} · ${offerings} matching ${offerings === 1 ? 'offering' : 'offerings'}`;
}
function renderCourse(course: Course, offering?: Offering) {
  document.querySelector('#page-title')!.textContent = course.title;
  document.querySelector('#page-description')!.textContent = course.description;
  document.querySelector('#archive-counts')!.innerHTML = `<div class="codes">${courseCodes(course)}</div>`;
  const available = matchingOfferings(catalog, course, state);
  const semesters = catalog.semesters.filter((s) => available.some((o) => o.semesterId === s.id));
  const shared = resourceTable(course.sharedFiles, 'Shared course materials');
  const fileFilterSlot = document.querySelector('#offering-file-filter')!;
  fileFilterSlot.innerHTML = '';
  let body: string;
  if (offering) {
    const files = offering.files.filter((f) => (!fileType || f.type === fileType) && matches([f.name, f.folder, courseText(catalog, course), offeringText(catalog, offering)].join(' '), state.query));
    const types = [...new Set(offering.files.map((f) => f.type))].sort(compare);
    fileFilterSlot.innerHTML = `<label class="file-filter"><span>Offering file type</span><select id="file-type"><option value="">All types</option>${types.map((t) => `<option value="${esc(t)}" ${fileType === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    body = `<section class="offering-materials"><button id="back-offerings" class="back-link">${icon('ArrowLeft')}All offerings for this course</button><div class="offering-context"><div><span class="semester-label">${esc(entity(catalog.semesters, offering.semesterId))}</span><h2>${esc(offering.section)}</h2><p>${icon('Users')}${offering.professorIds.map((id) => esc(professorName(id))).join(' · ')}</p></div><span class="offering-file-count">${offering.files.length} ${offering.files.length === 1 ? 'file' : 'files'}</span></div><div class="section-heading"><h3>Offering materials</h3></div>${resourceTable(files, 'Materials for the selected offering', offering.files.length ? 'No files match the current search or file type.' : 'No materials have been added to this offering yet.')}</section>`;
  } else {
    body = `<div class="section-heading"><h2>Semester offerings</h2><span>${available.length} ${available.length === 1 ? 'offering' : 'offerings'}</span></div>${available.length ? semesters.map((semester) => `<section class="semester-group"><h3>${esc(semester.name)}</h3><div class="offering-list">${available.filter((o) => o.semesterId === semester.id).map((o) => `<article class="offering-row"><div><h4>${esc(o.section)}</h4><p>${icon('Users')}${o.professorIds.map((id) => esc(professorName(id))).join(' · ')}</p></div><div class="offering-actions"><span>${o.files.length} ${o.files.length === 1 ? 'file' : 'files'}</span><button class="action-button" data-offering="${esc(o.id)}" aria-label="View materials for ${esc(semester.name)}, ${esc(o.section)}, ${o.professorIds.map((id) => esc(professorName(id))).join(', ')}">View materials ${icon('ChevronRight')}</button></div></article>`).join('')}</div></section>`).join('') : `<div class="empty compact"><h3>${course.offerings.length ? 'No offerings match these filters' : 'No semester offerings yet'}</h3><p>${course.offerings.length ? 'Change the semester or instructor filter to see other offerings.' : 'Shared course materials are available below when provided.'}</p></div>`}`;
  }
  document.querySelector('#content')!.innerHTML = `<div class="course-affiliations">${icon('Library')}<span>${esc(listingNames(course))}</span>${course.listings.length > 1 ? '<span class="cross-badge">Cross-listed course</span>' : ''}</div>${course.majorIds.length ? `<p class="major-membership">Majors: ${course.majorIds.map((id) => esc(entity(catalog.majors, id))).join(' · ')}</p>` : ''}${body}<section class="shared-materials"><div class="section-heading"><div><h2>Shared course materials</h2><p>Applies to the course across semesters and instructors.</p></div><span>${course.sharedFiles.length} ${course.sharedFiles.length === 1 ? 'file' : 'files'}</span></div>${shared}</section>`;
  document.querySelectorAll<HTMLButtonElement>('[data-offering]').forEach((button) => button.addEventListener('click', () => update({ offering: button.dataset.offering! })));
  document.querySelector('#back-offerings')?.addEventListener('click', () => update({ offering: '' }));
  document.querySelector<HTMLSelectElement>('#file-type')?.addEventListener('change', (event) => { fileType = (event.target as HTMLSelectElement).value; renderCourse(course, offering); paintIcons(); document.querySelector<HTMLSelectElement>('#file-type')?.focus(); });
  document.querySelector('#status')!.textContent = offering ? `${entity(catalog.semesters, offering.semesterId)} · ${offering.section} · ${offering.files.length} offering ${offering.files.length === 1 ? 'file' : 'files'}` : `${available.length} matching ${available.length === 1 ? 'offering' : 'offerings'} · ${course.sharedFiles.length} shared ${course.sharedFiles.length === 1 ? 'file' : 'files'}`;
}
function render() {
  if (!ready) return;
  search.value = state.query;
  const course = catalog.courses.find((c) => c.id === state.course); const offering = course?.offerings.find((o) => o.id === state.offering);
  document.querySelector('#offering-file-filter')!.innerHTML = '';
  renderFilters(); renderBreadcrumbs(course, offering);
  if (course) renderCourse(course, offering); else renderCourseList();
  paintIcons();
}
document.querySelector('#home')!.addEventListener('click', () => { if (ready) { state = emptyState(); syncURL(); render(); } });
search.addEventListener('input', () => { if (!ready) return; update({ query: search.value, course: '', offering: '' }, true); search.focus(); });
document.querySelector('#help-toggle')!.addEventListener('click', (event) => { const help = document.querySelector<HTMLElement>('#help')!; help.hidden = !help.hidden; (event.currentTarget as HTMLButtonElement).setAttribute('aria-expanded', String(!help.hidden)); });
window.addEventListener('popstate', () => { if (ready && location.hash !== '#main') { readURL(); fileType = ''; render(); } });
document.addEventListener('keydown', (event) => { if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement) && !(event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); search.focus(); } });
async function load() {
  const result = await Effect.runPromise(Effect.either(loadCatalog));
  if (result._tag === 'Left') { document.querySelector('#content')!.innerHTML = `<div class="empty" role="alert"><h2>We couldn’t open the archive</h2><p>${esc(result.left.message)}</p><button id="retry" class="action-button">Try again</button></div>`; document.querySelector('#retry')!.addEventListener('click', load); document.querySelector('#status')!.textContent = 'Catalog unavailable'; return; }
  catalog = result.right; ready = true; readURL(); render();
}
paintIcons(); void load();
