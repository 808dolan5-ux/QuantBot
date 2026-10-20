import { base44 } from '@/api/base44Client';
import { MODELS } from '@/lib/models';
import { loadBars } from '@/lib/backtest/data';
import { runInWorker } from '@/lib/backtest/runWorker';
import { computeMetrics, downsample } from '@/lib/backtest/metrics';
import { marketStats } from '@/lib/backtest/marketStats';
import { testSignals } from '@/lib/backtest/signals';
import { saveScriptTest } from '@/lib/backtest/saveScriptTest';

const WARMUP = 300;
const logLine = (e) => `[${e.level.toUpperCase()}] ${e.t ? new Date(e.t).toISOString().slice(0, 16) : ''} ${e.msg}`;

// Backtests one MT5 / Pine script on one market and saves it to Test history
export async function testScript({ name, script, ds, model, onPhase = () => {} }) {
  const modelLabel = MODELS.find((m) => m.id === model)?.label;
  const log = [];
  const add = (level, msg) => log.push({ level, msg, t: Date.now() });
  add('info', `Script "${name}" (${script.language})`);

  onPhase(`${ds.symbol}: loading market data...`);
  const bars = await loadBars(ds);
  const n = bars.time.length;
  const start = Math.min(WARMUP, n - 1);

  onPhase(`Reading the script with ${modelLabel}...`);
  const t0 = Date.now();
  const res = await base44.functions.invoke('scriptTester', {
    code: script.code, language: script.language, model,
    market: { symbol: ds.symbol, timeframe: ds.timeframe, contract_size: ds.contract_size, point: ds.point, stats: marketStats(bars) },
  });
  const { sim_code: simCode, summary, rules, settings } = res.data;
  add('info', `Prepared the test with ${modelLabel} in ${Math.round((Date.now() - t0) / 1000)}s`);

  onPhase('Simulating trades...');
  const contractSize = ds.contract_size || 100;
  const sim = await runInWorker({ bars, startIndex: start, simCode, balance: settings.balance, contractSize, point: ds.point || 0.01 }, 90000);
  sim.log.forEach((e) => log.push(e));
  const metrics = computeMetrics(sim.trades, sim.equity, settings.balance, contractSize);
  const signals = testSignals(sim.trades);
  add(metrics.net >= 0 ? 'info' : 'warn', `Backtest: ${metrics.trades} trades, net ${metrics.net.toFixed(2)}, max DD ${metrics.maxDDPct.toFixed(2)}%`);

  onPhase('Saving results...');
  const period = { start: new Date(bars.time[start]).toISOString(), end: new Date(bars.time[n - 1]).toISOString() };
  const test = { name, script, ds, model, balance: settings.balance, summary, rules, simCode, metrics, results: signals.results, ...period };
  const saved = await saveScriptTest({ ...test, logText: log.map(logLine).join('\n').slice(0, 20000) }, sim.trades);
  return { ...test, ...saved, modelLabel, log, trades: sim.trades, equity: downsample(sim.equity) };
}