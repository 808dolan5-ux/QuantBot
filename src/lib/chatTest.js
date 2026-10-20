import { loadDatasets, loadBars } from '@/lib/backtest/data';
import { marketStats } from '@/lib/backtest/marketStats';
import { testScript } from '@/lib/backtest/testScript';
import { resultsMarkdown } from '@/lib/workspace';
import { scriptFromMessage } from '@/lib/chatScript';

let cached = null;

// Quant stats of every market + /test instructions, sent with every chat request
export async function quantContext() {
  if (cached) return cached;
  const parts = [];
  for (const ds of await loadDatasets()) {
    const { heatmaps, ...stats } = marketStats(await loadBars(ds)) || {};
    parts.push(`${ds.symbol} ${ds.timeframe} (contract ${ds.contract_size || 100}, point ${ds.point || 0.01}): ${JSON.stringify(stats)}`);
  }
  cached = [
    'QUANT DATA of the trader\'s markets (use it for sessions, stop/target sizes and bias):',
    parts.join('\n').slice(0, 5000),
    'BACKTESTING: when you want a script backtested, start your reply with /test and include the full script in one fenced code block. QuantBot then backtests it on every market and sends you the results. Read them, improve the script and /test again until it is solid, then reply without /test.',
  ].join('\n');
  return cached;
}

// Script in a reply that asked for a backtest, or null
export const testRequest = (content) => (/^\s*\/test\b/im.test(content) ? scriptFromMessage(content) : null);

// Backtests on every market and returns the results as a chat message
export async function runChatTest(name, script, model) {
  const results = [], errors = [];
  for (const ds of await loadDatasets()) {
    try { results.push(await testScript({ name, script, ds, model })); }
    catch (e) { errors.push(`${ds.symbol}: ${e.response?.data?.error || e.message}`); }
  }
  return `/test results\n\n${resultsMarkdown(name, results, errors)}`;
}