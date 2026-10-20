import { base44 } from '@/api/base44Client';

import { chatLocal } from '@/lib/localAi';

const { ChatSession, ChatMessage } = base44.entities;

export async function loadSessions(userId, group) {
  const query = { created_by_id: userId };
  if (group) query.group = group;
  const page = await ChatSession.filter(query, { sort: '-last_message_at', limit: 50 });
  return page.items;
}

export async function loadMessages(sessionId) {
  const page = await ChatMessage.filter({ session_id: sessionId }, { sort: 'created_date', limit: 200 });
  return page.items;
}

export const createSession = (title, group) =>
  ChatSession.create({ title, group: group || 'MT5', last_message_at: new Date().toISOString() });

export const setSessionGroup = (id, group) => ChatSession.update(id, { group });

export const renameSession = (id, title) => ChatSession.update(id, { title });

export const addUserMessage = (sessionId, content) =>
  ChatMessage.create({ session_id: sessionId, role: 'user', content });

export async function askQuantAI(sessionId, style, model) {
  if (model.startsWith('local:')) return askLocal(sessionId, style, model.slice(6));
  const res = await base44.functions.invoke('quantChat', { session_id: sessionId, style, model });
  return res.data.message;
}

// Desktop: a model running on this PC answers as QuantBot; nothing goes to the cloud AI
async function askLocal(sessionId, style, localModel) {
  const history = (await loadMessages(sessionId)).map((m) => ({ role: m.role, content: m.content }));
  const system = `You are QuantBot, an expert quant trading assistant. Write strategies only in MQL5 (MT5) or Pine Script v5, always including the entire code in one fenced block. Reply style: ${style}.`;
  const content = await chatLocal(localModel, [{ role: 'system', content: system }, ...history]);
  const message = await ChatMessage.create({ session_id: sessionId, role: 'assistant', content });
  await ChatSession.update(sessionId, { last_message_at: new Date().toISOString() });
  return message;
}

// API keys: encrypted and decrypted only on the server
const keys = async (payload) => (await base44.functions.invoke('apiKeys', payload)).data;
// Each returns the status of every provider: { anthropic: {linked, last4}, google: {linked, last4} }
export const getKeyStatus = () => keys({ action: 'status' });
export const saveKey = (provider, apiKey) => keys({ action: 'save', provider, api_key: apiKey });
export const removeKey = (provider) => keys({ action: 'remove', provider });

export async function deleteSession(id) {
  await ChatMessage.deleteMany({ session_id: id });
  await ChatSession.delete(id);
}

export function exportMarkdown(title, messages) {
  const md = `# ${title}\n\n` + messages
    .map((m) => `### ${m.role === 'user' ? 'Trader' : 'QuantBot'}\n\n${m.content}`)
    .join('\n\n---\n\n');
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^\w\- ]+/g, '').trim() || 'chat'}.md`;
  a.click();
  URL.revokeObjectURL(url);
}