import { loadDatasets, loadBars } from '@/lib/backtest/data';
import { marketStats } from '@/lib/backtest/marketStats';
import { quantHeatmaps } from '@/lib/backtest/quantHeatmaps';

// Desktop only: the project folder coding agents work in
export const ws = (op, ...args) => window.quantbotLocal.invoke('workspace', op, ...args);

const GUIDE = `# QuantBot project folder

QuantBot (the desktop app) watches this folder and backtests trading scripts you write here.

## Workflow
1. Read market data in \`data/\`: \`<SYMBOL>_<TF>.csv\` candles (time ISO UTC, open, high, low, close, volume)
   and \`<SYMBOL>_<TF>.stats.json\` (true-range quantiles, daily/hourly ranges, spread, and full heatmaps:
   weekday×hour return/volatility/up%, session ranges/returns/breakouts, year×month returns, autocorrelation).
   Use the stats to choose sessions, stop/target sizes and direction bias.
2. Write ONE complete script to \`inbox/<name>.mq5\` (MQL5) or \`inbox/<name>.pine\` (Pine Script v5).
   It must emit distinct BUY, SELL, CLOSE, TP and SL signals.
3. Within seconds QuantBot backtests it on every market. The script moves to \`scripts/\` and
   \`inbox/<name>.results.md\` replaces it (full data in \`results/<name>.json\`).
4. Read the results, improve the script, write it to \`inbox/\` again. Repeat.

Never edit \`data/\`; QuantBot rewrites it.
`;

// Candles + quant stats for every market, plus agent instructions (AGENTS.md, CLAUDE.md, GEMINI.md)
// prefix: '' for the main folder, 'local-models/<model>/' for a local AI model's folder
export async function exportWorkspaceData(prefix = '') {
  for (const f of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'README.md']) await ws('write', `${prefix}${f}`, GUIDE);
  for (const sub of ['inbox', 'scripts', 'results']) await ws('write', `${prefix}${sub}/.keep`, '');
  for (const ds of await loadDatasets()) {
    const bars = await loadBars(ds);
    const base = `${prefix}data/${ds.symbol}_${ds.timeframe}`;
    const rows = ['time,open,high,low,close,volume'];
    for (let i = 0; i < bars.time.length; i++) rows.push(`${new Date(bars.time[i]).toISOString()},${bars.open[i]},${bars.high[i]},${bars.low[i]},${bars.close[i]},${bars.volume[i]}`);
    await ws('write', `${base}.csv`, rows.join('\n'));
    const { heatmaps, ...stats } = marketStats(bars) || {};
    await ws('write', `${base}.stats.json`, JSON.stringify({ symbol: ds.symbol, timeframe: ds.timeframe, contract_size: ds.contract_size, point: ds.point, stats, heatmaps: quantHeatmaps(bars) }, null, 1));
  }
}

export function resultsMarkdown(name, results, errors) {
  const lines = [`# Backtest results: ${name}`, `Tested ${new Date().toISOString()}`, ''];
  for (const r of results) {
    const m = r.metrics;
    lines.push(`## ${r.ds.symbol} ${r.ds.timeframe} (${r.start.slice(0, 10)} to ${r.end.slice(0, 10)})`,
      `Net ${m.net.toFixed(2)} | trades ${m.trades} | win ${Number(m.winRate || 0).toFixed(1)}% | PF ${Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : 'inf'} | max DD ${m.maxDDPct.toFixed(2)}%`,
      ...r.results.map((x) => `- ${x.status} ${x.rule}: ${x.detail}`), '');
  }
  errors.forEach((e) => lines.push(`ERROR: ${e}`));
  return lines.join('\n');
}