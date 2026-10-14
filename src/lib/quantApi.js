import { base44 } from '@/api/base44Client';

const { ChatSession, ChatMessage, ChatGroup } = base44.entities;

export async function loadSessions(userId, group) {
  const query = { created_by_id: userId };
  if (group) query.group = group;
  const page = await ChatSession.filter(query, { sort: '-last_message_at', limit: 50 });
  return page.items;
}

export async function loadGroups(userId) {
  const page = await ChatGroup.filter({ created_by_id: userId }, { sort: 'name', limit: 100 });
  return page.items;
}

export const createGroup = (name) => ChatGroup.create({ name });

export async function loadMessages(sessionId) {
  const page = await ChatMessage.filter({ session_id: sessionId }, { sort: 'created_date', limit: 200 });
  return page.items;
}

export const createSession = (title, group) =>
  ChatSession.create({ title, group: group || 'General', last_message_at: new Date().toISOString() });

export const setSessionGroup = (id, group) => ChatSession.update(id, { group });

export const addUserMessage = (sessionId, content) =>
  ChatMessage.create({ session_id: sessionId, role: 'user', content });

export async function askQuantAI(sessionId, style) {
  const res = await base44.functions.invoke('quantChat', { session_id: sessionId, style });
  return res.data.message;
}

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