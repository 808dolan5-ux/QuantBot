import { base44 } from '@/api/base44Client';

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

export const addUserMessage = (sessionId, content) =>
  ChatMessage.create({ session_id: sessionId, role: 'user', content });

export async function askQuantAI(sessionId, style, model) {
  const res = await base44.functions.invoke('quantChat', { session_id: sessionId, style, model });
  return res.data.message;
}

// API keys: encrypted and decrypted only on the server
const keys = async (payload) => (await base44.functions.invoke('apiKeys', payload)).data;
export const getKeyStatus = () => keys({ action: 'status', provider: 'anthropic' });
export const saveKey = (apiKey) => keys({ action: 'save', provider: 'anthropic', api_key: apiKey });
export const removeKey = () => keys({ action: 'remove', provider: 'anthropic' });

export async function deleteSession(id) {
  await ChatMessage.deleteMany({ session_id: id });
  await ChatSession.delete(id);
}

export function exportMarkdown(title, messages) {
  const md = `# ${title}\n\n` + messages
    .map((m) => `### ${m.role === 'user' ? 'Trader' : 'Quant AI'}\n\n${m.content}`)
    .join('\n\n---\n\n');
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^\w\- ]+/g, '').trim() || 'chat'}.md`;
  a.click();
  URL.revokeObjectURL(url);
}