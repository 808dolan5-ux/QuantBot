import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { getKeyStatus } from '@/lib/quantApi';
import { defaultModel } from '@/lib/models';
import { loadDatasets } from '@/lib/backtest/data';
import { testScript } from '@/lib/backtest/testScript';
import { ws, resultsMarkdown } from '@/lib/workspace';
import { IS_LOCAL } from '@/desktop/isLocal';

// Desktop only: backtests every script an agent drops in the project folder's inbox/ on all markets
async function processInbox() {
  const files = await ws('scan');
  if (!files.length) return;
  const [user, status, datasets] = await Promise.all([base44.auth.me(), getKeyStatus(), loadDatasets()]);
  const model = status?.anthropic?.linked || status?.google?.linked ? defaultModel(status, user) : 'builtin';
  for (const f of files) {
    const name = f.file.replace(/\.(mq5|pine)$/i, '');
    const script = { code: f.code, language: /\.pine$/i.test(f.file) ? 'Pine' : 'MT5' };
    const t = toast({ title: `Backtesting ${f.file} from the project folder...` });
    const results = [], errors = [];
    for (const ds of datasets) {
      try { results.push(await testScript({ name, script, ds, model })); }
      catch (e) { errors.push(`${ds.symbol}: ${e.response?.data?.error || e.message}`); }
    }
    const json = results.map((r) => ({ symbol: r.ds.symbol, timeframe: r.ds.timeframe, start: r.start, end: r.end, version: r.version, metrics: r.metrics, checks: r.results, summary: r.summary, trades: r.trades.slice(0, 500), log: r.log.slice(-200) }));
    await ws('finish', f.file, resultsMarkdown(name, results, errors), JSON.stringify({ name, results: json, errors }, null, 1));
    t.update({ id: t.id, title: `${f.file} tested, results written` });
  }
}

export default function WorkspaceWatcher() {
  useEffect(() => {
    if (!IS_LOCAL) return;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try { await processInbox(); } finally { busy = false; }
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  return null;
}