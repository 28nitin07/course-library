import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Version the catalog request so a deployment cannot use an older cached schema.
const catalogVersion = createHash('sha256').update(readFileSync(new URL('./public/catalog.json', import.meta.url))).digest('hex').slice(0, 16);
export default defineConfig({ base: './', define: { __CATALOG_VERSION__: JSON.stringify(catalogVersion) } });
