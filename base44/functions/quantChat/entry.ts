import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { providerOf, toTurns, callUserModel } from '../../shared/llm.ts';
import { chatSystem, chatHistory, chatTranscriptPrompt, scriptNameOf } from '../../shared/chatPrompt.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, style, model } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id required' }, { status: 400 });
    const useOwnKey = model && model !== 'builtin';
    if (useOwnKey && !providerOf(model)) return Response.json({ error: 'Unknown model' }, { status: 400 });

    const session = await base44.entities.ChatSession.get(session_id);
    if (!session || session.created_by_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const page = await base44.entities.ChatMessage.filter({ session_id }, { sort: '-created_date', limit: 20 });
    const history = chatHistory((page.items ?? page).slice().reverse());
    const system = chatSystem(session.group, style, user.full_name);

    const reply = useOwnKey
      ? await callUserModel(base44, user.id, model, system, toTurns(history))
      : await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: chatTranscriptPrompt(system, history) });

    const message = await base44.entities.ChatMessage.create({ session_id, role: 'assistant', content: String(reply) });
    const scriptName = scriptNameOf(reply);
    await base44.entities.ChatSession.update(session_id, {
      last_message_at: new Date().toISOString(),
      ...(scriptName && scriptName !== session.title ? { title: scriptName } : {}),
    });

    return Response.json({ message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}