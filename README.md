# Course Library

A public course file repository built with TypeScript, Effect, and Vite. Visitors can browse courses, search materials, filter by file type, open files, and download them. You manage materials by committing files to GitHub.

## Run locally

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

## Add your courses

Create a folder for each course under `courses/`. Add PDFs, slides, notes, notebooks, or other files, including subfolders. Optionally add `course.json`:

```json
{
  "title": "Linear Algebra",
  "description": "Lecture notes, readings, and problem sets.",
  "category": "Mathematics"
}
```

Metadata is optional: the folder name becomes the course title. Root-level `course.json`, hidden files/folders, and symbolic links are excluded from downloads. The included getting-started collection is an actual downloadable guide; remove its folder when ready.

`npm run catalog` scans course folders and copies downloadable files into `public/materials/`. Run it again after changing materials during development, or restart `npm run dev`. Production builds regenerate the catalog automatically. File type is derived from each file's extension. Files open in a new tab; browser support determines whether they display or download.

## Publish on GitHub Pages

1. Sign in using `gh auth login -h github.com`.
2. Create a public GitHub repository and push this project to its `main` branch.
3. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. Run the **Deploy course library** workflow or push a commit. The workflow reports the public URL.

The workflow runs tests, builds the site, and deploys `dist/`. Relative asset and file URLs support both repository subpaths and a custom domain. No API keys or visitor accounts are needed. Visitors cannot upload files.

## Validation

```sh
npm test
npm run build
npm run preview
```

Effect handles catalog fetching, errors, and runtime schema validation (`src/catalog.ts`). The site is static and has no server or database. Keep files within GitHub and Pages storage limits; use external storage for large video collections. Only commit materials intended for public access and that you have permission to distribute.

Implementation references: [Effect](https://effect.website/docs/v3/getting-started/creating-effects/), [Vite GitHub Pages guide](https://vite.dev/guide/static-deploy#github-pages).
