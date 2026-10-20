import { loadDatasets } from '@/lib/backtest/data';
import { testScript } from '@/lib/backtest/testScript';
import { resultsMarkdown } from '@/lib/workspace';

// Backtests one script on every market; returns the results markdown + full JSON
export async function testAllMarkets(name, script, model = 'builtin') {
  const results = [], errors = [];
  for (const ds of await loadDatasets()) {
    try { results.push(await testScript({ name, script, ds, model })); }
    catch (e) { errors.push(`${ds.symbol}: ${e.response?.data?.error || e.message}`); }
  }
  const json = results.map((r) => ({ symbol: r.ds.symbol, timeframe: r.ds.timeframe, start: r.start, end: r.end, version: r.version, metrics: r.metrics, checks: r.results, summary: r.summary, trades: r.trades.slice(0, 500), log: r.log.slice(-200) }));
  return { md: resultsMarkdown(name, results, errors), json: JSON.stringify({ name, results: json, errors }, null, 1) };
}