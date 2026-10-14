import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { providerOf, callUserModel } from '../../shared/llm.ts';
import { parseJsonReply } from '../../shared/simContract.ts';
import { CONVERTER_SYSTEM, CONVERTER_SCHEMA, converterInputError, converterTask, converterResult } from '../../shared/converterPrompt.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const invalid = converterInputError(body);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    const useOwnKey = body.model && body.model !== 'builtin';
    if (useOwnKey && !providerOf(body.model)) return Response.json({ error: 'Unknown model' }, { status: 400 });

    const task = converterTask(body);
    const report = useOwnKey
      ? parseJsonReply(await callUserModel(base44, user.id, body.model, CONVERTER_SYSTEM, [{ role: 'user', content: task }], 20000))
      : await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: `${CONVERTER_SYSTEM}\n\n${task}`, response_json_schema: CONVERTER_SCHEMA });

    return Response.json(converterResult(report));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}