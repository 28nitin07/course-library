const storageKey = 'course-library-theme';
type Theme = 'dark' | 'light';

export function setupTheme() {
  const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
  const apply = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = theme === 'dark' ? '#101110' : '#fafbf8';
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    toggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };
  apply(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  toggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(theme);
    // Theme switching still works when browser storage is unavailable.
    try { localStorage.setItem(storageKey, theme); } catch {}
  });
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) apply(event.newValue === 'light' ? 'light' : 'dark');
  });
}
