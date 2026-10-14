import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { CLAUDE_MODELS, callClaude, getAnthropicKey } from '../../shared/claude.ts';
import { SIGNAL_SPEC, SIGNAL_RULE } from '../../shared/signals.ts';

const TARGETS = {
  MT5: 'a complete, compilable MetaTrader 5 Expert Advisor in strict MQL5 (#include <Trade\\Trade.mqh>, CTrade, unique magic number, SL and TP on every order, CopyBuffer for indicators, new-bar guard, no MQL4 functions)',
  Pine: 'a complete TradingView Pine Script v5 strategy (//@version=5, strategy() declaration, explicit entries/exits with stop loss and take profit, alert() calls)',
};

const SIM_CONTRACT = `sim_code is the BODY (no function wrapper, no imports) of a JavaScript function onBar(ctx) that reproduces the exact same trading logic for QuantBot's bar-by-bar simulator. It is called once per closed bar; orders fill at the NEXT bar's open; SL/TP are checked intrabar.
ctx fields:
- ctx.i: current bar index. Arrays (index with ctx.i, never read beyond ctx.i): ctx.time (ms, broker server time), ctx.open, ctx.high, ctx.low, ctx.close, ctx.volume (tick volume), ctx.spread (points).
- ctx.hour, ctx.minute, ctx.dayOfWeek (0=Sunday) of the current bar.
- ctx.position: null or {side:'long'|'short', entry, sl, tp, lots, barsOpen}.
- ctx.balance, ctx.equity, ctx.point, ctx.contractSize (P&L per 1 lot = price move * contractSize).
- ctx.state: plain object that persists between bars (store custom values, previous signals, daily P&L, etc.).
- ctx.ta (value at the current bar, optional offset = bars back): ema(src,len,offset), sma(src,len,offset), rsi(src,len,offset), atr(len,offset), highest(src,len,offset), lowest(src,len,offset), stdev(src,len,offset). src must be ctx.close/ctx.open/ctx.high/ctx.low/ctx.volume. Values are NaN during warm-up.
Return null (no action), {action:'buy'|'sell', lots, sl, tp} to open (sl/tp as absolute prices; lots sized from ctx.balance and the stop distance), {action:'close'}, or {action:'modify', sl, tp} to move stops (breakeven, trailing).
Signals: every buy/sell must set BOTH sl and tp. Strategy-logic exits must return {action:'close'} so the tester records them as CLOSE, separate from TP and SL hits. The tester checks that BUY, SELL, CLOSE, TP and SL each fire.
Must be plain ES2020, deterministic, no async, no external access.`;

const SYSTEM = `You are QuantBot's strategy converter and rule auditor. Convert the trader's strategy into the requested platform, write a matching simulation for QuantBot's backtester, and audit the code against every rule the trader gave.
- Output the FULL code file, never truncated, no placeholders.
- ${SIM_CONTRACT}
- The code must follow the DISTINCT SIGNALS standard given in the task, and the mandatory signal rule is always audited.
- Test each rule strictly against the converted code: "pass" if enforced, "fail" if violated or ignored, "warn" if partly enforced or not verifiable from code alone.
- Never invent profit, win rate or drawdown numbers: the simulator measures those.
- If no rules are given, audit general robustness (stop loss present, position sizing, no martingale/grid, no repainting, correct order handling).
- When a previous version and its test log are given, fix every listed issue, keep the core idea, and return the full improved version.
Respond with ONLY a JSON object, no Markdown fences, shaped exactly:
{"code": string, "sim_code": string, "summary": string, "results": [{"rule": string, "status": "pass"|"fail"|"warn", "detail": string}]}`;

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    sim_code: { type: 'string' },
    summary: { type: 'string' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: { rule: { type: 'string' }, status: { type: 'string', enum: ['pass', 'fail', 'warn'] }, detail: { type: 'string' } },
      },
    },
  },
};

function parseReport(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('The model did not return a readable report. Try again.');
  return JSON.parse(text.slice(start, end + 1));
}

const clip = (v, n) => String(v || '').slice(0, n);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { strategy, rules, target, model, market, previous } = await req.json();
    if (!strategy?.trim()) return Response.json({ error: 'Paste a strategy first' }, { status: 400 });
    if (strategy.length > 40000 || (rules || '').length > 10000) return Response.json({ error: 'Strategy or rules too long' }, { status: 400 });
    if (!TARGETS[target]) return Response.json({ error: 'Target must be MT5 or Pine' }, { status: 400 });
    const useClaude = model && model !== 'builtin';
    if (useClaude && !CLAUDE_MODELS.includes(model)) return Response.json({ error: 'Unknown model' }, { status: 400 });

    const marketInfo = market
      ? `MARKET: ${clip(market.symbol, 20)} ${clip(market.timeframe, 10)} bars, contract size ${Number(market.contract_size) || 100}, point ${Number(market.point) || 0.01}, starting balance ${Number(market.balance) || 10000}.`
      : '';
    let task = `Convert this strategy into ${TARGETS[target]}.\n${SIGNAL_SPEC[target]}\n${marketInfo}\n\nSTRATEGY:\n${strategy}\n\nRULES TO TEST AGAINST:\n1. (mandatory) ${SIGNAL_RULE}\n${rules?.trim() || '(no other rules given)'}`;
    if (previous) {
      task += `\n\nPREVIOUS VERSION CODE:\n${clip(previous.code, 60000)}\n\nPREVIOUS SIM CODE:\n${clip(previous.sim_code, 20000)}\n\nTEST LOG AND ISSUES TO FIX:\n${clip(previous.fix_prompt, 15000)}`;
    }

    let report;
    if (useClaude) {
      const apiKey = await getAnthropicKey(base44, user.id);
      if (!apiKey) return Response.json({ error: 'No Anthropic API key linked. Add one in Settings.' }, { status: 400 });
      const text = await callClaude(apiKey, model, SYSTEM, [{ role: 'user', content: task }], 20000);
      report = parseReport(text);
    } else {
      report = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM}\n\n${task}`,
        response_json_schema: REPORT_SCHEMA,
      });
    }

    return Response.json({
      code: String(report.code || ''),
      sim_code: String(report.sim_code || ''),
      summary: String(report.summary || ''),
      results: Array.isArray(report.results) ? report.results : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}