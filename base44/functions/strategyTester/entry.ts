import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { CLAUDE_MODELS, callClaude, getAnthropicKey } from '../../shared/claude.ts';

const TARGETS = {
  MT5: 'a complete, compilable MetaTrader 5 Expert Advisor in strict MQL5 (#include <Trade\\Trade.mqh>, CTrade, unique magic number, SL and TP on every order, CopyBuffer for indicators, new-bar guard, no MQL4 functions)',
  Pine: 'a complete TradingView Pine Script v5 strategy (//@version=5, strategy() declaration, explicit entries/exits with stop loss and take profit, alert() calls)',
};

const SYSTEM = `You are QuantBot's strategy converter and rule auditor. Convert the trader's strategy into the requested platform and then audit the converted code against every rule the trader gave.
- Output the FULL code file, never truncated, no placeholders.
- Test each rule strictly against the converted code and strategy logic: "pass" if the code enforces it, "fail" if it violates or ignores it, "warn" if partly enforced or it cannot be verified from code alone.
- You cannot run a backtest or see market data: never invent profit, win rate or drawdown numbers.
- If no rules are given, audit general robustness (stop loss present, position sizing, no martingale/grid, no repainting, correct order handling).
Respond with ONLY a JSON object, no Markdown fences, shaped exactly:
{"code": string, "summary": string, "results": [{"rule": string, "status": "pass"|"fail"|"warn", "detail": string}]}`;

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string' },
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

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { strategy, rules, target, model } = await req.json();
    if (!strategy?.trim()) return Response.json({ error: 'Paste a strategy first' }, { status: 400 });
    if (strategy.length > 40000 || (rules || '').length > 10000) return Response.json({ error: 'Strategy or rules too long' }, { status: 400 });
    if (!TARGETS[target]) return Response.json({ error: 'Target must be MT5 or Pine' }, { status: 400 });
    const useClaude = model && model !== 'builtin';
    if (useClaude && !CLAUDE_MODELS.includes(model)) return Response.json({ error: 'Unknown model' }, { status: 400 });

    const task = `Convert this strategy into ${TARGETS[target]}.\n\nSTRATEGY:\n${strategy}\n\nRULES TO TEST AGAINST:\n${rules?.trim() || '(none given)'}`;

    let report;
    if (useClaude) {
      const apiKey = await getAnthropicKey(base44, user.id);
      if (!apiKey) return Response.json({ error: 'No Anthropic API key linked. Add one in Settings.' }, { status: 400 });
      const text = await callClaude(apiKey, model, SYSTEM, [{ role: 'user', content: task }], 16000);
      report = parseReport(text);
    } else {
      report = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM}\n\n${task}`,
        response_json_schema: REPORT_SCHEMA,
      });
    }

    return Response.json({
      code: String(report.code || ''),
      summary: String(report.summary || ''),
      results: Array.isArray(report.results) ? report.results : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}