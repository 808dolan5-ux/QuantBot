// Bundles the desktop app's local backend (base44/shared/desktop plus the shared AI prompts) into one CommonJS file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Default field values from the entity schemas, so new local records match the hosted database
const schemasDir = path.join(root, 'base44', 'entities');
const defaults = Object.fromEntries(fs.readdirSync(schemasDir).filter((f) => f.endsWith('.jsonc')).map((f) => {
  const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, f), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const props = Object.entries(schema.properties || {}).filter(([, p]) => 'default' in p);
  return [schema.name, Object.fromEntries(props.map(([k, p]) => [k, p.default]))];
}));

export default defineConfig({
  root,
  define: { __ENTITY_DEFAULTS__: JSON.stringify(defaults) },
  build: {
    ssr: path.join(root, 'base44', 'shared', 'desktop', 'index.ts'),
    outDir: path.join(root, '..', 'desktop', 'backend'),
    emptyOutDir: true,
    rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.cjs' } },
  },
});