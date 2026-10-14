import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { providerOf, callUserModel } from '../../shared/llm.ts';
import { SIM_CONTRACT, marketText, parseJsonReply } from '../../shared/simContract.ts';

const BALANCE = 10000;

// Tester settings are fixed here so the trader only picks a chat and a timeframe
const SETTINGS = `TESTER SETTINGS (fixed, never ask the trader):
- Starting balance $${BALANCE}. One position at a time. Orders fill at the next bar's open, spread comes from the data, no commission.
- Run the script exactly as written with its default input values (lot size, risk %, SL/TP, sessions, filters, breakeven, trailing).
- Only open the sides the script opens: a long-only script never sells, a short-only script never buys.
- Position size: a fixed lot input in an MT5 script is used as-is; a risk % input is applied to ctx.balance and the stop distance. Otherwise (including Pine qty/contracts) risk 1% of balance per trade: lots = (ctx.balance * 0.01) / (stop distance * ctx.contractSize), rounded down to 0.01, min 0.01. Never invent a fixed lot.
- If an entry has no stop loss or take profit, use 1.5x ATR(14) for the stop and 2x the stop distance for the target, and say so in the rules.
- Session and time filters use ctx.hour / ctx.minute (broker server time of the data) with the script's own hours and offsets.`;

const SYSTEM = `You are QuantBot's strategy tester. You get a complete MetaTrader 5 (MQL5) or TradingView (Pine Script) script. Translate its trading logic into sim_code for QuantBot's bar-by-bar simulator so the backtest measures the script as written.
- Reproduce the logic faithfully: entries, filters, sessions, stops, targets, breakeven, trailing, partial closes (approximate as a stop move) and strategy exits. Do not improve or change the strategy.
- Logic that needs data the simulator lacks (ticks, other symbols, order book) is approximated on the available bars and noted in the rules. Build higher-timeframe values (H1/H4/D1 highs, lows, EMAs, Asian range) from the current bars inside ctx.state.
- ${SIM_CONTRACT}

${SETTINGS}

Respond with ONLY a JSON object, no Markdown fences, shaped exactly:
{"sim_code": string, "summary": string, "rules": [string]}
summary: one or two sentences on what the strategy does. rules: the entry, exit and risk rules exactly as implemented in sim_code, one short line each.`;

const SCHEMA = {
  type: 'object',
  properties: { sim_code: { type: 'string' }, summary: { type: 'string' }, rules: { type: 'array', items: { type: 'string' } } },
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code, language, model, market } = await req.json();
    if (!code?.trim()) return Response.json({ error: 'No script to test' }, { status: 400 });
    if (code.length > 80000) return Response.json({ error: 'Script is too long to test' }, { status: 400 });
    if (!['MT5', 'Pine'].includes(language)) return Response.json({ error: 'Script must be MT5 or Pine' }, { status: 400 });
    const useOwnKey = model && model !== 'builtin';
    if (useOwnKey && !providerOf(model)) return Response.json({ error: 'Unknown model' }, { status: 400 });

    const task = `${marketText({ ...market, balance: BALANCE })}\n\n${language === 'MT5' ? 'MQL5 EXPERT ADVISOR' : 'PINE SCRIPT'}:\n${code}`;
    const report = useOwnKey
      ? parseJsonReply(await callUserModel(base44, user.id, model, SYSTEM, [{ role: 'user', content: task }], 16000))
      : await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: `${SYSTEM}\n\n${task}`, response_json_schema: SCHEMA });

    if (!report?.sim_code) return Response.json({ error: 'The model could not translate this script. Try again.' }, { status: 502 });
    return Response.json({
      sim_code: String(report.sim_code),
      summary: String(report.summary || ''),
      rules: Array.isArray(report.rules) ? report.rules.map(String) : [],
      settings: { balance: BALANCE },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}