import { Effect } from 'effect';
import { createIcons, Folder, FileText, ArrowUp, Search, Download, HardDrive, BookOpen } from 'lucide';
import { loadCatalog, type Course } from './catalog';
import { fields, inScope, normalizeSelection, folders, searchFiles, compare } from './library';
import './style.css';

const icons = { Folder, FileText, ArrowUp, Search, Download, HardDrive, BookOpen };
const icon = (name: keyof typeof icons) => `<i data-lucide="${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}" aria-hidden="true"></i>`;
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const formatSize = (size: number) => size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`;
const app = document.querySelector<HTMLDivElement>('#app')!;
let courses: readonly Course[] = [];
let selection: string[] = [];
let query = '';
let type = '';
let sort = 'hierarchy';
let ready = false;

function readURL() {
  const params = new URLSearchParams(location.hash.slice(1));
  selection = normalizeSelection(courses, fields.map(({ key }) => params.get(key) || ''));
  // Keep links from the original flat catalog usable.
  const legacy = courses.find((course) => course.id === params.get('course') || course.id.split('/').includes(params.get('course') || ''));
  if (!selection.length && legacy) selection = fields.map(({ key }) => legacy[key]);
  query = params.get('q') || '';
  type = params.get('type') || '';
  sort = ['name', 'size'].includes(params.get('sort') || '') ? params.get('sort')! : 'hierarchy';
}
function syncURL() {
  const params = new URLSearchParams();
  selection.forEach((value, index) => params.set(fields[index].key, value));
  if (query) params.set('q', query);
  if (type) params.set('type', type);
  if (sort !== 'hierarchy') params.set('sort', sort);
  const next = `${location.pathname}${location.search}${params.size ? '#' + params : ''}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) history.pushState(null, '', next);
}
function navigate(next: string[]) {
  selection = normalizeSelection(courses, next); query = ''; type = '';
  syncURL(); render();
}

app.innerHTML = `<div class="desktop"><main id="main" class="window" tabindex="-1"><header class="titlebar"><h1>${icon('BookOpen')}Course Library</h1><span>Public archive</span></header><nav class="menubar" aria-label="Library actions"><button id="home">Home</button><button id="up">${icon('ArrowUp')}Up one level</button><button id="help-toggle" aria-expanded="false" aria-controls="help">Help</button><a href="https://github.com/28nitin07/course-library" target="_blank" rel="noopener">GitHub repository</a></nav><section id="help" hidden><h2>Using the library</h2><p>Open folders in this order: Department → Course → Semester → Professor → Course code → Files. You can also use the filters to jump to a location.</p><p>Search matches filenames and all five course fields within your current location. Files open in a new tab; use Download to save a copy.</p><p>To add materials, commit a folder containing your files and a course.json to GitHub. See the repository README for the metadata format.</p></section><div class="address-row"><span>Address</span><nav id="address" aria-label="Current location" class="inset"></nav></div><div class="explorer"><aside class="sidebar"><h2>${icon('HardDrive')}Course archive</h2><p>Browse by department</p><nav id="departments" aria-label="Departments"></nav><div class="sidebar-tip"><strong>Folder order</strong><ol>${fields.map(({ label }) => `<li>${label}</li>`).join('')}</ol></div></aside><section class="contents" aria-label="Course browser"><div id="filters" class="filters"></div><div class="searchbar"><label for="search">${icon('Search')}Find</label><input id="search" name="search" type="search" placeholder="File, professor, or course code…" autocomplete="off"><label class="sr-only" for="type">File type</label><select id="type"><option value="">All file types</option></select><button id="clear" title="Clear search and file type">Clear</button></div><div class="list-heading"><h2 id="location-title">Course archive</h2><label>Sort <select id="sort"><option value="hierarchy">Folder order</option><option value="name">File name</option><option value="size">Largest file</option></select></label></div><div id="results" class="inset results" aria-live="polite"><p class="message" role="status">Reading course catalog…</p></div></section></div><footer class="statusbar" role="status"><span id="status">Connecting…</span><span id="scope-status">Public · read only</span></footer></main><div class="desktop-footer"><span>Course Library</span><span>Department / Course / Semester / Professor / Code</span></div></div>`;

const search = document.querySelector<HTMLInputElement>('#search')!;
const typeSelect = document.querySelector<HTMLSelectElement>('#type')!;
const sortSelect = document.querySelector<HTMLSelectElement>('#sort')!;

function renderResults() {
  const rows = searchFiles(courses, selection, query, type);
  const fileView = selection.length === fields.length || !!query.trim() || !!type;
  const groups = folders(courses, selection);
  const target = document.querySelector('#results')!;
  document.querySelector('#location-title')!.textContent = fileView ? (query.trim() || type ? 'Search results' : 'Files') : `${fields[selection.length].label}${selection.length === 0 ? 's' : ''}`;
  sortSelect.disabled = !fileView;
  if (fileView) {
    rows.sort((a, b) => {
      if (sort === 'size') return b.file.size - a.file.size || compare(a.file.name, b.file.name);
      if (sort === 'hierarchy') for (const { key } of fields) { const order = compare(a.course[key], b.course[key]); if (order) return order; }
      return compare(a.file.name, b.file.name);
    });
    target.innerHTML = rows.length ? `<table><caption class="sr-only">Files in the selected course location</caption><thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Size</th><th scope="col">Save</th></tr></thead><tbody>${rows.map(({ course, file }) => `<tr><td><div class="file-name">${icon('FileText')}<div><a href="${escape(file.url)}" target="_blank" rel="noopener">${escape(file.name)}</a>${selection.length < fields.length ? `<span class="file-location">${fields.map(({ key }) => escape(course[key])).join(' / ')}</span>` : ''}${file.folder ? `<span class="file-location">${escape(file.folder)}</span>` : ''}</div></div></td><td>${escape(file.type)}</td><td class="size">${formatSize(file.size)}</td><td><a class="download" href="${escape(file.url)}" download="${escape(file.name)}" aria-label="Download ${escape(file.name)}">${icon('Download')}<span>Download</span></a></td></tr>`).join('')}</tbody></table>` : `<div class="message"><h3>No files found.</h3><p>${query || type ? 'Try another search or clear the filters.' : 'No materials have been added to this course offering yet.'}</p></div>`;
  } else {
    target.innerHTML = groups.length ? `<table><caption class="sr-only">${escape(fields[selection.length].label)} folders</caption><thead><tr><th scope="col">Name</th><th scope="col">Contains</th><th scope="col">Files</th></tr></thead><tbody>${groups.map((group, index) => `<tr><td><button class="folder-link" data-folder="${index}">${icon('Folder')}${escape(group.name)}</button></td><td class="kind">${selection.length === fields.length - 1 ? 'Files' : escape(fields[selection.length + 1].label)}</td><td class="size">${group.files}</td></tr>`).join('')}</tbody></table>` : `<div class="message"><h3>The archive is empty.</h3><p>Add your first course offering to start sharing materials.</p></div>`;
    target.querySelectorAll<HTMLButtonElement>('[data-folder]').forEach((button) => button.addEventListener('click', () => navigate([...selection, groups[Number(button.dataset.folder)].name])));
  }
  document.querySelector('#status')!.textContent = `${fileView ? `${rows.length} file(s)` : `${groups.length} folder(s)`} · ${inScope(courses, selection).length} offering(s)`;
  document.querySelector('#scope-status')!.textContent = 'Public · read only';
  createIcons({ icons });
}

function render() {
  const departmentNames = [...new Set(courses.map((course) => course.department))].sort(compare);
  document.querySelector('#departments')!.innerHTML = `<button class="tree-item ${!selection.length ? 'selected' : ''}" data-dept="-1">${icon('HardDrive')}All departments</button>${departmentNames.map((name, index) => `<button class="tree-item ${selection[0] === name ? 'selected' : ''}" data-dept="${index}">${icon('Folder')}<span>${escape(name)}</span></button>`).join('')}`;
  document.querySelectorAll<HTMLButtonElement>('[data-dept]').forEach((button) => button.addEventListener('click', () => navigate(Number(button.dataset.dept) < 0 ? [] : [departmentNames[Number(button.dataset.dept)]])));
  document.querySelector('#filters')!.innerHTML = fields.map(({ label }, index) => {
    const choices = index <= selection.length ? folders(courses, selection.slice(0, index)) : [];
    return `<label>${label}<select data-level="${index}" ${index > selection.length ? 'disabled' : ''}><option value="">All ${label.toLowerCase()}s</option>${choices.map(({ name }) => `<option value="${escape(name)}" ${selection[index] === name ? 'selected' : ''}>${escape(name)}</option>`).join('')}</select></label>`;
  }).join('');
  document.querySelectorAll<HTMLSelectElement>('[data-level]').forEach((select) => select.addEventListener('change', () => {
    const next = selection.slice(0, Number(select.dataset.level));
    if (select.value) next.push(select.value);
    navigate(next);
    document.querySelector<HTMLSelectElement>(`[data-level="${select.dataset.level}"]`)?.focus();
  }));
  document.querySelector('#address')!.innerHTML = `<button data-depth="0">Course archive</button>${selection.map((value, index) => `<span aria-hidden="true">/</span><button data-depth="${index + 1}" ${index === selection.length - 1 ? 'aria-current="location"' : ''}>${escape(value)}</button>`).join('')}`;
  document.querySelectorAll<HTMLButtonElement>('[data-depth]').forEach((button) => button.addEventListener('click', () => navigate(selection.slice(0, Number(button.dataset.depth)))));
  document.querySelector<HTMLButtonElement>('#up')!.disabled = !selection.length;
  search.value = query;
  const types = [...new Set(inScope(courses, selection).flatMap((course) => course.files.map((file) => file.type)))].sort(compare);
  typeSelect.innerHTML = `<option value="">All file types</option>${[...new Set([...types, ...(type ? [type] : [])])].map((value) => `<option value="${escape(value)}" ${type === value ? 'selected' : ''}>${escape(value)}</option>`).join('')}`;
  sortSelect.value = sort;
  renderResults();
}

document.querySelector('#home')!.addEventListener('click', () => navigate([]));
document.querySelector('#up')!.addEventListener('click', () => navigate(selection.slice(0, -1)));
document.querySelector('#help-toggle')!.addEventListener('click', (event) => {
  const help = document.querySelector<HTMLElement>('#help')!;
  help.hidden = !help.hidden;
  (event.currentTarget as HTMLButtonElement).setAttribute('aria-expanded', String(!help.hidden));
});
search.addEventListener('input', () => { query = search.value; syncURL(); renderResults(); });
typeSelect.addEventListener('change', () => { type = typeSelect.value; syncURL(); renderResults(); });
sortSelect.addEventListener('change', () => { sort = sortSelect.value; syncURL(); renderResults(); });
document.querySelector('#clear')!.addEventListener('click', () => { query = ''; type = ''; syncURL(); render(); search.focus(); });
window.addEventListener('popstate', () => { if (ready && location.hash !== '#main') { readURL(); render(); } });
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement) && !(event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); search.focus(); }
});

async function load() {
  document.querySelector('#status')!.textContent = 'Loading catalog…';
  const result = await Effect.runPromise(Effect.either(loadCatalog));
  if (result._tag === 'Left') {
    document.querySelector('#results')!.innerHTML = `<div class="message" role="alert"><h2>Cannot read course catalog</h2><p>${escape(result.left.message)}</p><button id="retry">Retry</button></div>`;
    document.querySelector('#retry')!.addEventListener('click', load);
    document.querySelector('#status')!.textContent = 'Catalog unavailable';
    return;
  }
  courses = result.right.courses; ready = true; readURL(); render();
}
createIcons({ icons });
void load();
