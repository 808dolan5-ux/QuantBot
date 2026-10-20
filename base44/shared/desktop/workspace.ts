// Desktop app only. A project folder on this PC that coding agents (Claude Code, Codex, Antigravity) open:
// QuantBot writes market data + stats into it, agents drop scripts in inbox/, QuantBot backtests them
// and replaces each inbox script with its results.
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
  return {
    get: () => ({ folder: folder() }),
    set(dir) {
      const d = String(dir || '').trim();
      if (d) for (const sub of ['data', 'inbox', 'scripts', 'results']) fs.mkdirSync(path.join(d, sub), { recursive: true });
      fs.writeFileSync(cfgFile, JSON.stringify({ folder: d }));
      return { folder: d };
    },
    write(rel, text) { fs.writeFileSync(inside(rel), String(text)); return true; },
    // Scripts waiting in inbox/ (skips files still being written)
    scan() {
      if (!folder()) return [];
      const dir = inside('inbox/x');
      return fs.readdirSync(path.dirname(dir)).filter((f) => SCRIPT.test(f)).map((f) => {
        const p = path.join(path.dirname(dir), f);
        return { file: f, mtime: fs.statSync(p).mtimeMs, code: fs.readFileSync(p, 'utf8') };
      }).filter((s) => Date.now() - s.mtime > 1500);
    },
    // Script moves to scripts/, inbox/<name>.results.md takes its place, full results in results/
    finish(file, resultsMd, resultsJson) {
      const name = path.basename(file);
      const stem = name.replace(SCRIPT, '');
      const src = inside(`inbox/${name}`);
      if (fs.existsSync(src)) fs.renameSync(src, inside(`scripts/${name}`));
      fs.writeFileSync(inside(`inbox/${stem}.results.md`), resultsMd);
      fs.writeFileSync(inside(`results/${stem}.md`), resultsMd);
      fs.writeFileSync(inside(`results/${stem}.json`), resultsJson);
      return true;
    },
  };
}