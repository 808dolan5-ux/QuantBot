// UI build for the QuantBot desktop app, run by the GitHub build: the same pages, but every data, AI and
// file call goes to the desktop app's local backend instead of Base44.
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  root,
  base: '/',
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@/api/base44Client', replacement: path.join(root, 'src/desktop/localClient.js') },
      { find: '@/lib/AuthContext', replacement: path.join(root, 'src/desktop/LocalAuthContext.jsx') },
      { find: '@', replacement: path.join(root, 'src') },
    ],
  },
  build: { outDir: path.join(root, '../desktop/ui'), emptyOutDir: true },
});