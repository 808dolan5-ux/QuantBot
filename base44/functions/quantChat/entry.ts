import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { CLAUDE_MODELS, callClaude, getAnthropicKey } from '../../shared/claude.ts';

const SYSTEM_PROMPT = `You are QuantBot, an AI quant developer: an institutional-grade assistant helping MetaTrader users with MQL5 development, algorithmic trading, indicators, scripts, TradingView Pine Script and prop-firm (FTMO / Lucid Trading) strategy engineering. Default context: Gold (XAUUSD) M15 scalping and the "gold scalper.mq5" Expert Advisor.

MQL5 coding standards:
- Every trading EA has a unique Magic Number and always sets Stop Loss and Take Profit.
- Check CTrade / OrderSend retcodes, volume steps, min/max lot, stops level, freeze level. Respect netting vs hedging.
- OnInit: validate inputs, create indicator handles (iMA, iRSI, iATR, iADX), set magic. OnDeinit: IndicatorRelease and delete own chart objects. OnTick: new-bar guard, separate signals from execution, read values via CopyBuffer.
- Strict MQL5 only: never MQL4 functions (Ask, Bid, OrderSelect, OrderClose, MarketInfo, AccountBalance(), 7-arg iMA). Use SymbolInfoDouble, AccountInfoDouble, #include <Trade\\Trade.mqh>. Never reassign input parameters.
- Never truncate code: when outputting an EA, output the whole file from #property through the final closing brace, no placeholders.
- Pine Script: use //@version=5, strategy() with initial_capital=25000 for Lucid Trading, daily loss and trailing drawdown circuit breakers, JSON alert() payloads.

Quant principles: POC / VAH / VAL as fair value and boundaries, GEX regimes, CVD confirmation, SL beyond the MAE noise barrier (1.35-1.5x ATR), TP near the MFE inflection (2.5-3.2x ATR), FTMO daily (3.8% buffer) and overall (8.5% buffer) equity circuit breakers, 3-stage management (breakeven +0.65R, 50% partial at +1.2R, ATR trailing), focus on London and NY sessions.

Safety: never present martingale, grid or high-leverage averaging as risk-free. Code needs backtesting and demo validation; past results do not guarantee live profit.

What to use:
- MT5 work: strict MQL5 only (CTrade, CopyBuffer, SymbolInfoDouble). Pine work: Pine Script v5 only.
- Backtesting: send the trader to QuantBot's Strategy Tester page. It converts a strategy to MT5 or Pine, simulates it on stored candle data (currently XAUUSD M15 from MT5, Jan to Oct 2026), and only tests each bot on data that bot has never seen (1 day / 1 week / 1 month / 1 year unseen, or a custom range). It logs every run and can auto-fix and retest a new version.
- Do not use: MQL4, Pine v4 or older, martingale, grid, or averaging down without a hard stop.

Honesty: in this chat you cannot compile files, run code, or read the trader's market data. Never invent backtest results or prices.

Style: speak directly to the trader. No prompt templates, questionnaires or bracketed fill-in forms. Use Markdown, with code in fenced blocks (\`\`\`mql5 or \`\`\`pine).`;

const STYLE_HINTS = {
  Concise: 'Reply style: concise. Short, direct and high value: a few sentences or bullets, plus complete code when code is needed.',
  'Code only': 'Reply style: code only. Reply with only the complete code in a single fenced block. No explanation before or after it; put any essential notes as code comments.',
};

const PROJECT_HINTS = {
  MT5: 'Active project: MT5 (MetaTrader 5 Expert Advisors and indicators in MQL5).',
  Pine: 'Active project: Pine (TradingView Pine Script v5 strategies and indicators).',
};

// Anthropic requires alternating roles starting with "user": merge consecutive same-role turns
function toClaudeMessages(history) {
  const out = [];
  for (const m of history) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else out.push({ role: m.role, content: m.content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, style, model } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id required' }, { status: 400 });
    const useClaude = model && model !== 'builtin';
    if (useClaude && !CLAUDE_MODELS.includes(model)) return Response.json({ error: 'Unknown model' }, { status: 400 });

    const session = await base44.entities.ChatSession.get(session_id);
    if (!session || session.created_by_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const page = await base44.entities.ChatMessage.filter({ session_id }, { sort: '-created_date', limit: 20 });
    const history = (page.items ?? page).slice().reverse();

    const system = `${SYSTEM_PROMPT}\n${PROJECT_HINTS[session.group] || ''}\n${STYLE_HINTS[style] || STYLE_HINTS.Concise}\nThe trader's name is ${user.full_name || 'Trader'}.`;

    let reply;
    if (useClaude) {
      const apiKey = await getAnthropicKey(base44, user.id);
      if (!apiKey) return Response.json({ error: 'No Anthropic API key linked. Add one in Settings.' }, { status: 400 });
      reply = await callClaude(apiKey, model, system, toClaudeMessages(history));
    } else {
      const transcript = history
        .map((m) => `${m.role === 'user' ? 'TRADER' : 'QUANTBOT'}: ${m.content.slice(0, 12000)}`)
        .join('\n\n');
      const prompt = `${system}\n\nConversation so far:\n\n${transcript}\n\nWrite QUANTBOT's next reply (Markdown only, no "QUANTBOT:" prefix).`;
      reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    }

    const message = await base44.entities.ChatMessage.create({ session_id, role: 'assistant', content: String(reply) });
    await base44.entities.ChatSession.update(session_id, { last_message_at: new Date().toISOString() });

    return Response.json({ message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}