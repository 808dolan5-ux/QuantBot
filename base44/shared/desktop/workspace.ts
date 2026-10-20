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
  // BackTester file edited since its last test (skips files still being written)
  const scanBackTester = (sub) => {
    const tested = Number(fs.existsSync(inside(`${sub}results/BackTester.tested`)) ? fs.readFileSync(inside(`${sub}results/BackTester.tested`), 'utf8') : 0);
    return ['BackTester.mq5', 'BackTester.pine'].flatMap((f) => {
      const p = inside(`${sub}${f}`);
      if (!fs.existsSync(p)) return [];
      const mtime = fs.statSync(p).mtimeMs;
      if (mtime <= tested || Date.now() - mtime < 1500) return [];
      return [{ file: f, sub, mtime, code: fs.readFileSync(p, 'utf8'), backtester: true }];
    });
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
    remove(rel) { const p = inside(rel); if (fs.existsSync(p)) fs.rmSync(p, { recursive: true }); return true; },
    list(rel) {
      const p = inside(`${rel.replace(/\/?$/, '/')}x`).slice(0, -1);
      return fs.existsSync(p) ? fs.readdirSync(p).map((f) => (fs.statSync(path.join(p, f)).isDirectory() ? `${f}/` : f)) : [];
    },
    // Main inbox plus every local model's inbox
    scan() {
      if (!folder()) return [];
      const models = path.dirname(inside('local-models/x'));
      const subs = fs.readdirSync(models).filter((m) => fs.statSync(path.join(models, m)).isDirectory()).map((m) => `local-models/${m}/`);
      return ['', ...subs].flatMap((sub) => [...scanDir(sub), ...scanBackTester(sub)]);
    },
    // BackTester.mq5 / .pine stays in place; results sit next to it
    finishBackTester(file, resultsMd, resultsJson, sub = '', mtime = 0) {
      fs.writeFileSync(inside(`${sub}BackTester.results.md`), resultsMd);
      fs.writeFileSync(inside(`${sub}results/latest.md`), resultsMd);
      fs.writeFileSync(inside(`${sub}results/BackTester.json`), resultsJson);
      fs.writeFileSync(inside(`${sub}results/BackTester.tested`), String(mtime));
      return true;
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