// Desktop app only. A project folder on this PC that coding agents (Claude Code, Codex, Antigravity) open:
// QuantBot writes market data + stats into it, agents drop scripts in inbox/, QuantBot backtests them
// and replaces each inbox script with its results. Each local AI model gets the same layout in
// local-models/<model>/.
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT = /\.(mq5|pine)$/i;

export function createWorkspace(dataDir) {
  const cfgFile = path.join(dataDir, 'workspace.json');
  const folder = () => { try { return JSON.parse(fs.readFileSync(cfgFile, 'utf8')).folder || ''; } catch { return ''; } };
  const inside = (rel) => {
    const root = folder();
    if (!root) throw new Error('No project folder set in Settings');
    const p = path.resolve(root, rel);
    if (!p.startsWith(path.resolve(root))) throw new Error('Path outside the project folder');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    return p;
  };
  // Scripts waiting in one inbox (skips files still being written)
  const scanDir = (sub) => {
    const dir = path.dirname(inside(`${sub}inbox/x`));
    return fs.readdirSync(dir).filter((f) => SCRIPT.test(f)).map((f) => {
      const p = path.join(dir, f);
      return { file: f, sub, mtime: fs.statSync(p).mtimeMs, code: fs.readFileSync(p, 'utf8') };
    }).filter((s) => Date.now() - s.mtime > 1500);
  };
  return {
    get: () => ({ folder: folder() }),
    set(dir) {
      const d = String(dir || '').trim();
      if (d) for (const sub of ['data', 'inbox', 'scripts', 'results']) fs.mkdirSync(path.join(d, sub), { recursive: true });
      fs.writeFileSync(cfgFile, JSON.stringify({ folder: d }));
      return { folder: d };
    },
    write(rel, text) { fs.writeFileSync(inside(rel), String(text)); return true; },
    read(rel) { const p = inside(rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; },
    exists(rel) { return fs.existsSync(inside(rel)); },
    // Main inbox plus every local model's inbox
    scan() {
      if (!folder()) return [];
      const models = path.dirname(inside('local-models/x'));
      const subs = fs.readdirSync(models).filter((m) => fs.statSync(path.join(models, m)).isDirectory()).map((m) => `local-models/${m}/`);
      return ['', ...subs].flatMap(scanDir);
    },
    // Script moves to scripts/, inbox/<name>.results.md takes its place, full results in results/
    finish(file, resultsMd, resultsJson, sub = '') {
      const name = path.basename(file);
      const stem = name.replace(SCRIPT, '');
      const src = inside(`${sub}inbox/${name}`);
      if (fs.existsSync(src)) fs.renameSync(src, inside(`${sub}scripts/${name}`));
      fs.writeFileSync(inside(`${sub}inbox/${stem}.results.md`), resultsMd);
      fs.writeFileSync(inside(`${sub}results/${stem}.md`), resultsMd);
      fs.writeFileSync(inside(`${sub}results/latest.md`), resultsMd);
      fs.writeFileSync(inside(`${sub}results/${stem}.json`), resultsJson);
      return true;
    },
  };
}