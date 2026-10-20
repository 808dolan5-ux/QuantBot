import { ws } from '@/lib/workspace';
import { testAllMarkets } from '@/lib/backtest/testAll';

// Commands a local agent can use. It is locked to its own folder; paths are relative to it.
export const TOOLS_GUIDE = `You work alone in your own folder and act ONLY through commands. Reply with exactly ONE command per message:

LIST <dir>            list files (use . for your folder)
READ <path>           read a file
WRITE <path>          create/overwrite a file; put the full content in one fenced code block after the line
DELETE <path>         delete a file or folder
BACKTEST <path>       backtest a .mq5 or .pine script on every market; you get PnL, drawdown, costs, win rate, PF, rule checks
DONE <summary>        finish when the script is good

Market data and stats are in data/. Loop: write the script, BACKTEST it, read the weak points, fix, BACKTEST again.`;

const FENCE = /```[\w-]*\n([\s\S]*?)```/;

// Runs the first command in the reply; returns { output, done }
export async function runCommand(dir, reply, model) {
  const m = reply.match(/^\s*(LIST|READ|WRITE|DELETE|BACKTEST|DONE)\b[ \t]*(.*)$/m);
  if (!m) return { output: 'No command found. Reply with one command such as WRITE, BACKTEST or DONE.' };
  const [, cmd, arg] = m;
  const rel = arg.trim().replace(/^\.\/?/, '');
  if (cmd === 'DONE') return { output: arg, done: true };
  if (cmd !== 'LIST' && !rel) return { output: `${cmd} needs a path.` };
  if (cmd === 'LIST') return { output: (await ws('list', `${dir}${rel}`)).join('\n') || '(empty)' };
  if (cmd === 'READ') return { output: (await ws('read', `${dir}${rel}`)).slice(0, 6000) || '(missing or empty)' };
  if (cmd === 'DELETE') { await ws('remove', `${dir}${rel}`); return { output: `Deleted ${rel}` }; }
  if (cmd === 'WRITE') {
    const body = reply.match(FENCE)?.[1];
    if (body == null) return { output: 'WRITE needs the file content in a fenced code block.' };
    await ws('write', `${dir}${rel}`, body);
    return { output: `Wrote ${rel} (${body.length} chars)` };
  }
  const code = await ws('read', `${dir}${rel}`);
  if (!code) return { output: `${rel} not found.` };
  const script = { code, language: /\.pine$/i.test(rel) ? 'Pine' : 'MT5' };
  const stem = rel.split('/').pop().replace(/\.\w+$/, '');
  const { md, json } = await testAllMarkets(`${model} ${stem}`, script);
  await ws('write', `${dir}results/${stem}.md`, md);
  await ws('write', `${dir}results/${stem}.json`, json);
  return { output: md.slice(0, 5000) };
}