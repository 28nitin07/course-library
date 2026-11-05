# Course Library

A public file archive built with TypeScript, Effect, and Vite, with a minimal Windows 98 Explorer interface.

## Organization

**Department → Course → Semester → Professor → Course code → Files**

Each course offering has its own folder and `course.json`. The catalog discovers manifests at any depth. Recommended layout:

```text
courses/
  mathematics/
    linear-algebra/
      semester-1/
        professor-name/
          ma101/
            course.json
            Lecture 1.pdf
            assignments/
              Problem set 1.pdf
```

```json
{
  "department": "Mathematics",
  "course": "Linear Algebra",
  "semester": "Semester 1",
  "professor": "Professor name",
  "courseCode": "MA101",
  "description": "Lecture notes and problem sets."
}
```

Use a separate offering folder for each semester, professor, and course code combination. Metadata determines the displayed hierarchy; folder names determine storage and download URLs. Offerings with identical metadata share a browser folder and their files appear together. Do not nest one offering's `course.json` inside another offering.

Department, course, semester, professor, and code are sorted in that order, with natural number ordering. Search matches filenames, file subfolders, descriptions, and all five metadata fields within the current location. Search terms match together; wrap a phrase in quotes for an exact phrase, such as `MA101 "Professor A"`. The five cascading filters, breadcrumb buttons, Home, and Up navigate the same hierarchy. Browser Back/Forward and shared URLs preserve location and search.

Older flat course folders remain supported: `title` maps to course and `category` maps to department. Missing department is shown as “Unassigned department”; missing semester, professor, and code show “Not specified”. Add the five metadata fields to fully classify older folders. A top-level folder without any manifest is treated as a legacy offering. Hidden paths, symbolic links, and course.json files are not downloadable.

The only included material is a starter guide under `courses/library/`; remove this folder when ready. Visitors browse and download; only repository contributors manage files.

## Run locally

Requires Node.js 22.18 or later (the tests use Node's built-in TypeScript support).

```sh
npm ci
npm run dev
```

After adding or changing course files during development, restart the dev server or run `npm run catalog` to rebuild the index. Every production build regenerates the catalog and copies files into `public/materials/`.

## Publish

This repository is published at https://28nitin07.github.io/course-library/ . Pushing to `main` runs tests, builds the site, and deploys through `.github/workflows/pages.yml`. Pages must use **GitHub Actions** in repository Settings → Pages.

All assets and downloads use relative URLs, including repository subpath hosting. No visitor accounts, API keys, server, or database are needed. Browser support determines whether an opened file is displayed or downloaded; the Download control saves files directly.

## Validation

```sh
npm test
npm run build
npm run preview
```

`src/catalog.ts` uses Effect for network errors and runtime schema validation. `src/library.ts` is shared, tested hierarchy/filter logic. Tests cover nested offerings, all five sort fields, scope isolation, search, dependent selection resets, encoded download URLs, stale file cleanup, hidden files, symlinks, and invalid metadata.

Only commit materials intended for public access and that you have permission to distribute. Use external storage for files exceeding GitHub or Pages limits.
