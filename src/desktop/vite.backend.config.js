// Bundles the desktop app's local backend (and the shared AI prompts it uses) into one CommonJS file
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  root,
  build: {
    ssr: path.join(root, 'src/desktop/backend/index.js'),
    outDir: path.join(root, '../desktop/backend'),
    emptyOutDir: true,
    rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.cjs' } },
  },
});