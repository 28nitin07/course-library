# Style lock — Course Library

Updated 2026-11-05. Source: user requested Windows XP as inspiration for a university-specific archive; rejected Windows 98 replication.

## Direction contract
An academic catalog with XP-inspired materials: blue title strip, cream command bar, pale blue task pane, yellow folders, and restrained raised buttons. The layout serves course discovery and comparing offerings. No fake desktop controls or OS simulation. Operate/Read; variance 4, motion 1, density 6, art direction 6. Current TypeScript/Effect/Vite/Lucide stack retained, no new dependencies. See reference-board.md for consulted sources and inspiration boundaries.

## Data and layout
Departments, majors, courses, semesters, instructors, and offerings have separate stable identities. Major membership is independent of department listings. One course row includes all cross-listed codes. Semester-grouped offerings show parallel sections and every instructor. Shared files have a separate section. A searchable scrolling department pane accommodates long lists; independent major/semester/instructor filters avoid a rigid five-level folder tree. Mobile substitutes a department selector and stacks directory rows and offering comparisons.

## Color contract
Background #e8eff7; surface #ffffff; chrome #f4f2e9; blue #174a8b; blue-dark #113363; blue-bright #3269c6; blue-light #eaf2fc; sidebar #d9e5f5; line #c2cee0; text #23354c; muted #52647b; green #285d2a; folder fill #f4cd62 with edge #795d15. Shadow rgba(26,55,94,.14).
Verified: text/white 12.46:1; text/blue-light 11.04:1; blue/white 8.79:1; blue/blue-light 7.79:1; white/blue-bright 5.29:1; muted/cream 5.40:1; green/blue-light 6.92:1. Header gradient uses white text on endpoints that pass AA. Lines are decorative; focus uses blue-bright. Do not place dark text on primary blue. Single light theme.

## Type, space, and shape
Tahoma/Verdana/Arial. Main titles 23–27px, course links 13px, body 12–13px, secondary labels 10–11px. Spacing 4/6/8/10/12/14/16/18/20/22/24/30/32/44px. Corners 3–5px on controls/panels and 9px on header frame. Modest window shadow, shallow button bevels. Column layout: 250px department task pane + flexible main; 210px sidebar below 1080px; stacked layout below 780px.

## Assets and motion
Existing Lucide icon family; folder icons gold, navigation ink blue/green. No imagery or copyrighted Windows assets. XP is aesthetic inspiration, not an official Microsoft design-system implementation. Results use 140ms opacity feedback only when reduced motion is not requested; ordinary controls respond immediately. Static motion and visual scans pass.

## Verification and memory
Test fixtures include 24 majors and departments, a cross-listed course, simultaneous sections, team teaching, and changed faculty across semesters. Browser QA verifies cross-listed navigation, instructor/semester isolation, offering files vs shared files, and mobile comparison. Fixtures are temporary and not published. Actual catalog contains only the starter guide.
Project decision log and style lock updated. No global personal profile changes. Current XP execution pending user review; requested inspiration recorded without assuming approval of this implementation.
