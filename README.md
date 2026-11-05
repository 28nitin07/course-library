# Course Library

A public university course archive built with TypeScript, Effect, and Vite. The minimal terminal-style interface has a search bar at the top, course results in the main area, and filters on the right.

Dark mode is the default. The header’s **Dark mode** toggle switches between dark and light; the choice is remembered in browser storage and applied before styles load.

## Academic model

- **Departments** and **majors** are separate registries. A major is not assumed to be a department.
- A **course** has a permanent ID, title, zero or more major memberships, and one or more department/code listings. Cross-listed codes lead to the same course and files. A course is counted once in the overall directory and once in each listed department.
- An **offering** belongs to one course and semester, has a unique ID within that course, and identifies its section and all instructors. Parallel sections remain separate. Team teaching uses several professor IDs in one offering. Reuse an instructor's ID across semesters; use different IDs for different people, even if their names match.
- **Shared files** belong to the course across all offerings. **Offering files** belong only to the offering in whose folder they are stored. Shared files are never silently attributed to a professor or semester.

A course is a stable academic identity, not a combination of department, instructor, and semester. Do not create a second course to add a cross-listing or a new semester.

## Add your university registries

Edit `catalog.config.json`. These are illustrative values; the imported collection is a personal archive, not the university's official catalog.

```json
{
  "departments": [
    { "id": "math", "name": "Mathematics" },
    { "id": "cs", "name": "Computer Science" }
  ],
  "majors": [
    { "id": "math-major", "name": "Mathematics" },
    { "id": "cs-major", "name": "Computer Science" }
  ],
  "semesters": [
    { "id": "2026-fall", "name": "Fall 2026", "order": 20263 },
    { "id": "2026-spring", "name": "Spring 2026", "order": 20261 }
  ]
}
```

Add as many majors and departments as required. IDs are permanent references; display names can be changed. Semester `order` is an explicit integer: larger values display first, avoiding guesses about your university's term names. Keep the guide's `library` department while its course remains, or remove the guide when adding your catalog.

## Add a course

Create one course folder and a `course.json`:

```text
courses/
  linear-algebra/
    course.json
    shared/
      Reading list.pdf
    offerings/
      2026-fall-a/
        offering.json
        Lecture 1.pdf
      2026-fall-b/
        offering.json
        Lecture 1.pdf
      2026-spring-a/
        offering.json
        Lecture 1.pdf
```

`courses/linear-algebra/course.json`:

```json
{
  "id": "linear-algebra",
  "title": "Linear Algebra",
  "description": "Matrices, linear transformations, and vector spaces.",
  "listings": [
    { "departmentId": "math", "code": "MATH 201" },
    { "departmentId": "cs", "code": "CS 201" }
  ],
  "majorIds": ["math-major", "cs-major"]
}
```

Course folders may be nested for storage, but a course cannot contain another course's manifest. Visible organization comes from metadata, not directory names. `description` and `majorIds` are optional. All other course fields above are required. A department/code pair can be assigned to only one canonical course in this catalog; add aliases to its listings rather than duplicating it.

## Add semester offerings

`courses/linear-algebra/offerings/2026-fall-a/offering.json`:

```json
{
  "id": "2026-fall-a",
  "semesterId": "2026-fall",
  "section": "Section A",
  "professors": [
    { "id": "professor-rao", "name": "Professor Rao" }
  ]
}
```

For a parallel class, add a separate offering folder with another ID and section, such as `2026-fall-b` / `Section B`, and that class's professor and files. For a team-taught class, put both instructors in the same `professors` array. For a later semester, create another offering referencing that semester and its actual instructor IDs.

Every offering requires an ID, known semester ID, a section label, and at least one professor. When instructor details cannot be verified, use `professors: []` with `instructorsUnverified: true`; the interface labels this explicitly and creates no fictitious instructor filter. Section labels must be unique within a course and semester; use the university's actual section identifier or an equally clear label. Offering IDs are scoped to their course. An instructor ID must have a consistent name everywhere; identical names with different IDs remain different people and are disambiguated in the interface.

All files beneath an offering manifest belong to that offering, including nested folders. Files elsewhere in the course folder are shared course materials. Manifests, hidden paths, and symbolic links are excluded. Offerings cannot be nested inside other offerings.

## Browse and search

Department, major, semester, and instructor filters are independent and grouped in the right-hand panel. On mobile, that panel becomes a collapsible section below the search bar. Searching matches titles, descriptions, every cross-listed code and department, major names, semester names, instructors, sections, and filenames. Multiple search terms must match the same course/offering context; quoted phrases match as a phrase. The same course is never duplicated for its cross-listings.

The course page groups offerings by semester, showing sections and every instructor before visitors open files. Offering pages retain the course, semester, section, and faculty context. Shared materials appear in a separately labeled section. Result counts respect the active filters; the course directory's Total files column counts all of that course's files. Breadcrumbs and browser Back/Forward preserve navigation, and URL links use permanent IDs.

## Migration from the old hierarchy

The previous scalar `department/course/semester/professor/courseCode` manifest is replaced by the model above. For each real course:

1. Choose one permanent course ID and create one course manifest.
2. Add all department/code aliases to `listings` and actual major memberships to `majorIds`.
3. Move each semester/section's files into an offering folder with its own manifest and instructors.
4. Move only genuinely coursewide files into shared folders.

No university data was present during this migration; the starter guide was migrated to `courses/library-guide/`. Do not assume that same-title courses are equivalent: match them using the university's official catalog and assign IDs accordingly. Invalid or old manifests fail the build with a specific error rather than being guessed into the new model.

## Run and publish

Node.js 22.18 or later is required.

```sh
npm ci
npm run dev
npm test
npm run build
```

After changing course files locally, rerun `npm run catalog` or restart the dev server. Each production build regenerates the catalog and downloadable assets. Effect handles fetching and runtime schema validation. The catalog request is content-versioned to prevent an old schema from being used after deployment.

Pushing to `main` deploys through `.github/workflows/pages.yml` to https://28nitin07.github.io/course-library/ . The workflow runs tests and a production build. No API keys, visitor accounts, server, or database are needed. Visitors can browse/download; file management happens in GitHub.

Validation covers more than 20 majors and departments, cross-listing counts/search, parallel sections, team teaching, changed faculty across semesters, identical display names with distinct IDs, invalid references, duplicate identities, encoded download paths, exact file bytes, hidden files, symlinks, and stale asset cleanup. Browser QA uses temporary, clearly labeled test fixtures; those fixtures are not published.

Only publish materials you intend to make public and have permission to distribute. GitHub and Pages file/storage limits still apply.

## Imported course materials and download storage

The course collection excludes personal submissions, programming projects, student answer scripts, draft essays, unverified scans, duplicate files within a course, and documents requiring further review. Original source files are never deleted by importing. The local selection and exclusions are recorded in `.local-import/selection.json`, which is ignored by Git.

Files under `courses/**/materials/**` are tracked with Git LFS. Each offering's `downloads.json` lists public LFS URLs and identical GitHub Releases backup assets. The builder reads these manifests and excludes both the LFS files and their Git pointer contents from the Pages artifact. GitHub Actions leaves LFS fetching disabled, avoiding a full collection download on every deployment.

Download buttons check the LFS URL with a lightweight HEAD request and use the Releases copy if the check fails, including blocked or exhausted LFS access. Modified clicks and copying a URL retain the primary link. A successful check followed by a later transfer failure cannot be detected by this static website; use the backup link in that case. This availability check does not monitor billing usage or change account budgets. Keep the account's LFS budget capped if paid overages are unwanted.

Releases backups must be uploaded and verified before publishing download manifests. Updating a file requires uploading the new LFS object, refreshing its size and primary URL, and uploading its matching backup asset. Preserve existing backup assets for older links.
