// QuantBot's local backend for the desktop app: what Base44 does for the web version (data, files, keys,
// AI calls), done in the app's data folder on this PC. Bundled into the desktop app by the GitHub build.
import fs from 'fs';
import path from 'path';
import { createDb } from './db.js';
import { createUser, createKeys, createFiles } from './store.js';
import { createFunctions } from './functions.js';

export function createBackend({ dataDir, encrypt, decrypt, userName }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const user = createUser(dataDir, userName);
  const db = createDb(path.join(dataDir, 'entities'), 'local');
  const keys = createKeys(dataDir, encrypt, decrypt);
  const files = createFiles(path.join(dataDir, 'files'));
  const functions = createFunctions({ db, user, keys });

  return {
    handle(kind, ...args) {
      switch (kind) {
        case 'entity': return db.run(...args);
        case 'user': return args[0] === 'update' ? user.update(args[1]) : user.me();
        case 'file': return files.upload(args[0], args[1]);
        case 'function': {
          const fn = functions[args[0]];
          if (!fn) throw new Error(`Unknown function ${args[0]}`);
          return fn(args[1] || {});
        }
        default: throw new Error('Unknown request');
      }
    },
    filePath: files.path,
    flush: db.flush,
  };
}