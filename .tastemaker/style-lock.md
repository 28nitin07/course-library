# Style lock — Course Library

Updated 2026-11-05. Source: explicit user request for minimal Windows 98 styling. Supersedes warm editorial direction.

## Direction
Public course file browser in Operate/Read mode. Classic Windows Explorer window on a teal desktop. Variance 3, motion 1, density 8, art direction 6. First viewport: five academic filters and folder list. No marketing hero or decorative window controls. All displayed actions work. Existing vanilla TypeScript, Effect, Vite, and Lucide retained; native controls and custom CSS, no new dependencies or external assets.

## Palette and color contract
Desktop #008080; button face #c0c0c0; white #ffffff; soft bevel #dfdfdf; shadow #808080; black #000000; navy selection/title #000080; muted #404040; folder #ffff80 with edge #665500.
Verified: black/white 21:1; black/gray face 11.54:1; white/navy 16.01:1; navy/gray face 8.80:1; white/teal 4.77:1. Muted used only on white or gray. Bevel light/shadow colors are decorative; controls have black edges and dotted black focus outlines. Selected white text on navy, never black/navy. Single light system theme.

## Typography, shape, and spacing
Tahoma / MS Sans Serif / Arial. Body 12px, labels 11px, title 12px bold. Square corners, inset/raised 1px and 2px bevels. Layout: centered Explorer window, narrow department sidebar, address breadcrumbs, five cascading filters, compact search, details table, status bar. Spacing 2/4/6/8/10/12/16/20/24/32px; desktop window top offset 70px. Mobile: hide sidebar, retain breadcrumbs and all filters, stack filter fields. Table remains scrollable; downloads keep accessible names.

## Functionality
Hierarchy: Department → Course → Semester → Professor → Course code → Files. Parent changes reset children; metadata and folder navigation share the same logic. Search matches all metadata fields and filenames within the selected scope. URL location/search supports browser history. Missing metadata is explicitly labeled, never inferred as a real semester or professor.

## Assets and motion
Existing Lucide icons, small yellow folders and navy document strokes. No imagery required for this file browser. Native CSS buttons respond immediately; 120ms opacity entrance only under prefers-reduced-motion:no-preference. No animation dependency. Static scans pass.

## Memory
User rejected previous visual direction and requested retro minimalism. Project decision log updated, no personal profile promotion. Current visual execution pending review; explicit Windows 98 direction is recorded as user-selected.
