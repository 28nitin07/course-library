# Style lock — Course Library

Updated 2026-11-05. Source: explicit user request for a simple minimal GUI, terminal styling, search at the top, and filters on the right. Supersedes XP styling.

## Direction and layout
A restrained monospace archive. No gradients, window chrome, shadows, permanently filled cards, decorative panels, or animated cursor. Top row: small course-library wordmark and text navigation. Full-width search directly below. Main results on the left and a 244px filter rail on the right, with a thin dividing line. Native selects for department, major, semester, and instructor; offering file type joins that panel only when relevant. Filters collapse under the search on mobile. Course and offering data model remains unchanged.

Operate/Read mode; variance 2, motion 1, density 7, art direction 4. Existing TypeScript/Effect/Vite/Lucide stack retained. No new dependencies. The course directory uses a sourced pixel folder asset. Native details/summary and selects provide simple accessible behavior.

## Color contract
Dark default: background/surface #101110, text #e2e7df, muted #a7afa4, accent #afd489, hover #1b211a, decorative lines #303930, control border #677460.
Verified dark text/background 15.08:1; text/hover 13.08:1; accent/background 11.36:1; muted/background 8.39:1; control border/background 3.82:1. Text never sits on a solid accent fill.
Light companion: background #fafbf8, surface #ffffff, text #242b24, muted #555f52, accent #345c22, hover #edf3e7, decorative lines #cdd3c9, control border #7a8776.
Verified light text/background 13.98:1, muted/background 6.43:1, accent/background 7.49:1, control border/background 3.64:1. Decorative hairlines do not carry interactive state. Focus and selected themes use contrasting accent color. Both palettes retain AA text and 3:1 control-boundary floors.

## Type and spacing
System monospace stack: ui-monospace / SFMono-Regular / Menlo / Monaco / Consolas / Liberation Mono. Search 14px; titles 20px; course links/body 12–13px; secondary labels 10–11px. Spacing 6/8/10/12/14/16/18/20/24/28/32/40/44/64px. Square edges, 1px lines. App maximum width 1380px; desktop side padding 32px. Filter rail 244px, gap 40px; responsive rail 218px below 1100px. Under 760px stack with collapsible filters above results.

## Interactions
Top search retains keyboard shortcut /. Course, semester, parallel section, multi-instructor, and cross-listed relationships stay explicit. Shared materials stay separate from offering files. Dark mode remains the default and remembers each visitor's choice; stored theme is applied before styles load. Result feedback uses 120ms opacity only with reduced-motion preference respected. No animated typing or simulation of running shell commands.

## Course folder directory
User approved the overall terminal UI and requested Finder-style course folders. Replace the course table with a native list of navigable folder links in an alphabetic responsive grid. Use a 72px pixelarticons folder (public/icons/folder.svg, MIT; original license bundled). Keep existing Lucide control icons. The pixel asset is the deliberate exception requested for the folder surface.

Grid: minimum 160px desktop items, 12px horizontal and 16px vertical gaps; 140px minimum mobile items. Folder names remain fully visible, followed by all cross-listed codes and total file/matching offering counts. Hover uses the locked hover token; keyboard focus uses the contrasting accent outline. Open with a single click or Enter; modified clicks retain native link behavior. Preserve existing course/semester/section hierarchy and URL filters. No decorative controls or simulated desktop chrome.

## Verification and memory
13 catalog/download tests, production build, SVG validation, motion audit, and static scan pass. Browser checks cover pixel icon rendering, cross-listed code search, keyboard opening, distinct semester offerings, theme-adaptive icons, and a two-column mobile layout with collapsed filters and no horizontal overflow. Project style lock and decisions updated; no personal profile promotion. Current folder spacing explicitly approved by the user; retain it for future updates.
