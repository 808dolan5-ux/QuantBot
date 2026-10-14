import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { providerOf, callUserModel } from '../../shared/llm.ts';
import { parseJsonReply } from '../../shared/simContract.ts';
import { TESTER_SYSTEM, TESTER_SCHEMA, testerInputError, testerTask, testerResult } from '../../shared/testerPrompt.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const invalid = testerInputError(body);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    const useOwnKey = body.model && body.model !== 'builtin';
    if (useOwnKey && !providerOf(body.model)) return Response.json({ error: 'Unknown model' }, { status: 400 });

    const task = testerTask(body);
    const report = useOwnKey
      ? parseJsonReply(await callUserModel(base44, user.id, body.model, TESTER_SYSTEM, [{ role: 'user', content: task }], 16000))
      : await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: `${TESTER_SYSTEM}\n\n${task}`, response_json_schema: TESTER_SCHEMA });

    const result = testerResult(report);
    if (!result) return Response.json({ error: 'The model could not translate this script. Try again.' }, { status: 502 });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}