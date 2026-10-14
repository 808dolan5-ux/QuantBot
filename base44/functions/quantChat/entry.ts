import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const SYSTEM_PROMPT = `You are Quant AI, a MetaTrader Assistant: an institutional quant developer helping MetaTrader users with MQL5 development, algorithmic trading, indicators, scripts, TradingView Pine Script and prop-firm (FTMO / Lucid Trading) strategy engineering. Default context: Gold (XAUUSD) M15 scalping and the "gold scalper.mq5" Expert Advisor.

MQL5 coding standards:
- Every trading EA has a unique Magic Number and always sets Stop Loss and Take Profit.
- Check CTrade / OrderSend retcodes, volume steps, min/max lot, stops level, freeze level. Respect netting vs hedging.
- OnInit: validate inputs, create indicator handles (iMA, iRSI, iATR, iADX), set magic. OnDeinit: IndicatorRelease and delete own chart objects. OnTick: new-bar guard, separate signals from execution, read values via CopyBuffer.
- Strict MQL5 only: never MQL4 functions (Ask, Bid, OrderSelect, OrderClose, MarketInfo, AccountBalance(), 7-arg iMA). Use SymbolInfoDouble, AccountInfoDouble, #include <Trade\\Trade.mqh>. Never reassign input parameters.
- Never truncate code: when outputting an EA, output the whole file from #property through the final closing brace, no placeholders.
- Pine Script: use //@version=5, strategy() with initial_capital=25000 for Lucid Trading, daily loss and trailing drawdown circuit breakers, JSON alert() payloads.

Quant principles: POC / VAH / VAL as fair value and boundaries, GEX regimes, CVD confirmation, SL beyond the MAE noise barrier (1.35-1.5x ATR), TP near the MFE inflection (2.5-3.2x ATR), FTMO daily (3.8% buffer) and overall (8.5% buffer) equity circuit breakers, 3-stage management (breakeven +0.65R, 50% partial at +1.2R, ATR trailing), focus on London and NY sessions.

Safety: never present martingale, grid or high-leverage averaging as risk-free. Code needs backtesting and demo validation; past results do not guarantee live profit.

Honesty: in this web app you cannot run the MT5 Strategy Tester, compile files, or read the trader's market data. Never invent backtest results or prices. If asked to backtest, explain how to run it in MT5 and what to look for.

Style: speak directly to the trader, concise and high value (2-4 sentences or bullets unless code is requested). No prompt templates, questionnaires or bracketed fill-in forms. Use Markdown, with code in fenced blocks (\`\`\`mql5 or \`\`\`pine).`;

const STYLE_HINTS = {
  Normal: '',
  Concise: 'Reply style: very short and punchy.',
  Explanatory: 'Reply style: explain the reasoning step by step.',
  Formal: 'Reply style: formal, professional tone.',
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, style } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id required' }, { status: 400 });

    const session = await base44.entities.ChatSession.get(session_id);
    if (!session || session.created_by_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const page = await base44.entities.ChatMessage.filter({ session_id }, { sort: '-created_date', limit: 20 });
    const history = (page.items ?? page).slice().reverse();
    const transcript = history
      .map((m) => `${m.role === 'user' ? 'TRADER' : 'QUANT AI'}: ${m.content.slice(0, 12000)}`)
      .join('\n\n');

    const prompt = `${SYSTEM_PROMPT}\n${STYLE_HINTS[style] || ''}\nThe trader's name is ${user.full_name || 'Trader'}.\n\nConversation so far:\n\n${transcript}\n\nWrite QUANT AI's next reply (Markdown only, no "QUANT AI:" prefix).`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    const message = await base44.entities.ChatMessage.create({ session_id, role: 'assistant', content: String(reply) });
    await base44.entities.ChatSession.update(session_id, { last_message_at: new Date().toISOString() });

    return Response.json({ message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}