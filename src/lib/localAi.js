import { loadDatasets } from '@/lib/backtest/data';
import { scriptFromMessage } from '@/lib/chatScript';
import { ws, exportWorkspaceData } from '@/lib/workspace';

// Desktop only: AI models running on this PC (Ollama, LM Studio, llama.cpp, Jan)
const ai = (op, ...args) => window.quantbotLocal.invoke('localai', op, ...args);
const KEY = 'quantbot-local-ai';

export const SERVERS = {
  ollama: { label: 'Ollama', url: 'http://localhost:11434' },
  openai: { label: 'LM Studio / OpenAI-compatible', url: 'http://localhost:1234' },
};
export const getServer = () => JSON.parse(localStorage.getItem(KEY) || 'null') || { kind: 'ollama', url: SERVERS.ollama.url };
export const setServer = (s) => localStorage.setItem(KEY, JSON.stringify(s));
export const runningModels = () => ai('models', getServer());
export const chatLocal = (model, messages) => ai('chat', getServer(), model, messages);

export const slug = (model) => model.replace(/[^\w.-]+/g, '-');
export const modelDir = (model) => `local-models/${slug(model)}/`;

// Creates the model's folder with all market data the first time it is seen running
export async function ensureModelFolder(model) {
  if (await ws('exists', `${modelDir(model)}AGENTS.md`)) return false;
  await exportWorkspaceData(modelDir(model));
  return true;
}

// Asks the local model for a full script using its folder's data + last results; drops it in its inbox
export async function writeScript(model, language, idea) {
  const dir = modelDir(model);
  const guide = await ws('read', `${dir}AGENTS.md`);
  const stats = [];
  for (const ds of await loadDatasets()) stats.push((await ws('read', `${dir}data/${ds.symbol}_${ds.timeframe}.stats.json`)).slice(0, 1600));
  const last = (await ws('read', `${dir}results/latest.md`)).slice(0, 3000);
  const lang = language === 'Pine' ? 'Pine Script v5 (TradingView)' : 'MQL5 (MT5 Expert Advisor)';
  const prompt = [
    `Write ONE complete, compilable ${lang} trading strategy in a single fenced code block.`,
    'It must have clear BUY, SELL, CLOSE, TP and SL logic. Base sessions, stop and target sizes on the market stats.',
    idea && `Strategy idea: ${idea}`,
    `Market stats:\n${stats.join('\n').slice(0, 5000)}`,
    last && `Backtest results of your previous script, fix its weaknesses:\n${last}`,
  ].filter(Boolean).join('\n\n');
  const reply = await ai('chat', getServer(), model, [{ role: 'system', content: guide }, { role: 'user', content: prompt }]);
  const script = scriptFromMessage(reply);
  if (!script) throw new Error('The model did not return an MT5 or Pine code block. Try again or use a larger model.');
  const file = `script-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${script.language === 'Pine' ? 'pine' : 'mq5'}`;
  await ws('write', `${dir}inbox/${file}`, script.code);
  return file;
}