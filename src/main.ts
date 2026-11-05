import { Effect } from 'effect';
import { createIcons, BookOpen, Library, Search, Download, ArrowUpRight, FolderOpen, Files, X, ArrowLeft, FileText, Github, SlidersHorizontal } from 'lucide';
import { loadCatalog, type Course, type Resource } from './catalog';
import './style.css';

const icons = { BookOpen, Library, Search, Download, ArrowUpRight, FolderOpen, Files, X, ArrowLeft, FileText, Github, SlidersHorizontal };
const icon = (name: keyof typeof icons) => `<i data-lucide="${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}" aria-hidden="true"></i>`;
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const app = document.querySelector<HTMLDivElement>('#app')!;
let courses: readonly Course[] = [];
const params = new URLSearchParams(location.hash.slice(1));
let selected = params.get('course') || '';
let query = params.get('q') || '';
let type = params.get('type') || '';
let sort = params.get('sort') || 'name';

app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="./">${icon('BookOpen')}<span>Course<br><strong>Library</strong></span></a><div class="sidebar-label">YOUR OPEN SHELF</div><nav aria-label="Library"><button id="all-courses" class="nav-item">${icon('Library')}<span>All courses</span><span id="course-count" class="count">—</span></button><div class="sidebar-label courses-label">COURSES</div><div id="course-nav"></div></nav><div class="sidebar-bottom">A little knowledge,<br>a little more accessible.<span>Built to be shared.</span></div></aside><div class="workspace"><header class="topbar"><span>Public course repository</span><span class="public-label"><span></span>Open access</span></header><main id="main" tabindex="-1"><div id="content"><div role="status" class="loading">Opening the library…</div></div></main><footer><span>Learn something. Pass it on.</span><span>Course Library <span aria-hidden="true">↗</span></span></footer></div></div>`;

function syncURL() {
  const values = new URLSearchParams();
  if (selected) values.set('course', selected);
  if (query) values.set('q', query);
  if (type) values.set('type', type);
  if (sort !== 'name') values.set('sort', sort);
  history.replaceState(null, '', `${location.pathname}${location.search}${values.size ? '#' + values : ''}`);
}

function navigate(id: string) { selected = id; query = ''; type = ''; syncURL(); render(); }
document.querySelector('#all-courses')!.addEventListener('click', () => navigate(''));

function fileSize(size: number) { return size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }
function fileRow(file: Resource, course: Course) {
  return `<tr><td><div class="file-name"><span class="file-icon">${icon('FileText')}</span><div><a href="${escape(file.url)}" target="_blank" rel="noopener">${escape(file.name)}</a><span>${escape(file.folder || course.title)}</span></div></div></td><td><span class="file-type">${escape(file.type)}</span></td><td class="size-cell">${fileSize(file.size)}</td><td><a class="download" href="${escape(file.url)}" download="${escape(file.name)}" aria-label="Download ${escape(file.name)}">${icon('Download')}</a></td></tr>`;
}

function renderResults() {
  const scope = selected ? courses.filter((course) => course.id === selected) : courses;
  const term = query.trim().toLocaleLowerCase();
  const matches = scope.flatMap((course) => course.files.map((file) => ({ file, course }))).filter(({ file, course }) => (!type || file.type === type) && `${course.title} ${course.category} ${file.name} ${file.folder}`.toLocaleLowerCase().includes(term));
  matches.sort((a, b) => sort === 'size' ? b.file.size - a.file.size : a.file.name.localeCompare(b.file.name));
  const isFileView = !!selected || !!query || !!type;
  const target = document.querySelector('#results')!;
  if (isFileView) {
    target.innerHTML = `<div class="section-head"><h2>${selected ? 'Course materials' : 'Search results'}</h2><span>${matches.length} ${matches.length === 1 ? 'file' : 'files'}</span></div>${matches.length ? `<div class="table-wrap"><table><caption class="sr-only">Downloadable course materials</caption><thead><tr><th scope="col">FILE NAME</th><th scope="col">TYPE</th><th scope="col" class="size-cell">SIZE</th><th scope="col"><span class="sr-only">Download</span></th></tr></thead><tbody>${matches.map(({ file, course }) => fileRow(file, course)).join('')}</tbody></table></div>` : `<div class="empty">${icon('Search')}<h3>No materials found</h3><p>Try a different search or clear the filters.</p><button id="clear-filters" class="text-button">Clear filters ${icon('X')}</button></div>`}`;
    document.querySelector('#clear-filters')?.addEventListener('click', () => { query = ''; type = ''; syncURL(); render(); });
  } else {
    target.innerHTML = `<div class="section-head"><h2>Browse the shelves</h2><span>${courses.length} ${courses.length === 1 ? 'collection' : 'collections'}</span></div><div class="course-grid">${courses.map((course, index) => `<button class="course-card" data-course="${escape(course.id)}"><div class="card-top"><span class="collection-number">${String(index + 1).padStart(2, '0')}</span>${icon('ArrowUpRight')}</div><span class="category">${escape(course.category)}</span><h3>${escape(course.title)}</h3><p>${escape(course.description || 'Browse the files in this course.')}</p><div class="card-bottom">${icon('FolderOpen')}<span>${course.files.length} ${course.files.length === 1 ? 'resource' : 'resources'}</span></div></button>`).join('')}</div>${!courses.length ? `<div class="empty">${icon('BookOpen')}<h3>Your shelves are ready</h3><p>Add a folder in courses/ and publish it to share your first course.</p></div>` : ''}<div class="library-note"><span class="note-icon">${icon('BookOpen')}</span><div><h3>A growing collection, one course at a time.</h3><p>Notes, readings, and resources — gathered in one place and open to everyone.</p></div></div>`;
    target.querySelectorAll<HTMLButtonElement>('[data-course]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.course!)));
  }
  createIcons({ icons });
}

function render() {
  const course = courses.find((item) => item.id === selected);
  if (selected && !course) selected = '';
  document.querySelector('#course-count')!.textContent = String(courses.length);
  document.querySelector('#all-courses')!.classList.toggle('active', !selected);
  document.querySelector('#course-nav')!.innerHTML = courses.map((item) => `<button class="course-nav-item ${selected === item.id ? 'selected' : ''}" data-id="${escape(item.id)}">${icon('FolderOpen')}<span>${escape(item.title)}</span></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-id]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.id!)));
  const total = courses.reduce((sum, item) => sum + item.files.length, 0);
  document.querySelector('#content')!.innerHTML = `<div class="intro">${course ? `<button class="back text-button">${icon('ArrowLeft')} All courses</button>` : `<div class="eyebrow"><span></span> KNOWLEDGE, WITH AN OPEN DOOR</div>`}<h1>${course ? escape(course.title) : 'Good things are<br>better <em>shared.</em>'}</h1><p>${course ? escape(course.description) : 'A home for course notes, readings, and the things<br class="desktop-break"> worth keeping. Find what you need. Make it yours.'}</p><div class="intro-meta"><span>${icon('Library')}${courses.length} ${courses.length === 1 ? 'course' : 'courses'}</span><span>${icon('Files')}${total} ${total === 1 ? 'resource' : 'resources'}</span><span class="free-access">Free to explore</span></div></div><div class="toolbar"><label class="search">${icon('Search')}<input id="search" name="search" type="search" placeholder="Search courses, notes, or a file…" aria-label="Search course materials" value="${escape(query)}" autocomplete="off"><kbd>/</kbd></label><label class="filter">${icon('SlidersHorizontal')}<span class="sr-only">File type</span><select id="type"><option value="">All file types</option>${[...new Set(courses.flatMap((item) => item.files.map((file) => file.type)))].sort().map((value) => `<option ${type === value ? 'selected' : ''} value="${escape(value)}">${escape(value)}</option>`).join('')}</select></label><label class="sort"><span class="sr-only">Sort files</span><select id="sort"><option value="name" ${sort === 'name' ? 'selected' : ''}>Name A–Z</option><option value="size" ${sort === 'size' ? 'selected' : ''}>Largest first</option></select></label></div><div id="results" aria-live="polite"></div>`;
  document.querySelector('.back')?.addEventListener('click', () => navigate(''));
  document.querySelector<HTMLInputElement>('#search')!.addEventListener('input', (event) => { query = (event.target as HTMLInputElement).value; syncURL(); renderResults(); });
  document.querySelector<HTMLSelectElement>('#type')!.addEventListener('change', (event) => { type = (event.target as HTMLSelectElement).value; syncURL(); renderResults(); });
  document.querySelector<HTMLSelectElement>('#sort')!.addEventListener('change', (event) => { sort = (event.target as HTMLSelectElement).value; syncURL(); renderResults(); });
  renderResults();
}

async function load() {
  const result = await Effect.runPromise(Effect.either(loadCatalog));
  if (result._tag === 'Left') {
    document.querySelector('#content')!.innerHTML = `<div class="empty error" role="alert">${icon('Library')}<h1>We couldn’t open the library</h1><p>${escape(result.left.message)}</p><button class="retry">Try again</button></div>`;
    document.querySelector('.retry')!.addEventListener('click', load);
    createIcons({ icons });
    return;
  }
  courses = result.right.courses;
  render();
}
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLSelectElement)) {
    event.preventDefault(); document.querySelector<HTMLInputElement>('#search')?.focus();
  }
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#main') return;
  const values = new URLSearchParams(location.hash.slice(1));
  selected = values.get('course') || ''; query = values.get('q') || ''; type = values.get('type') || ''; sort = values.get('sort') || 'name'; render();
});
createIcons({ icons });
void load();
