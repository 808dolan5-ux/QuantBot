import { chatLocal, modelDir } from '@/lib/localAi';
import { exportWorkspaceData, ws } from '@/lib/workspace';
import { TOOLS_GUIDE, runCommand } from '@/lib/agentTools';

// One local agent working in local-models/<model>/agent-<n>/ until DONE, stop, or the step limit
export async function runAgent({ model, n, language, idea, steps, onLog, stopped }) {
  const dir = `${modelDir(model)}agent-${n}/`;
  if (!(await ws('exists', `${dir}AGENTS.md`))) await exportWorkspaceData(dir);
  const lang = language === 'Pine' ? 'Pine Script v5 (file ending .pine)' : 'MQL5 Expert Advisor (file ending .mq5)';
  const messages = [
    { role: 'system', content: `${TOOLS_GUIDE}\n\n${(await ws('read', `${dir}AGENTS.md`)).slice(0, 3000)}` },
    { role: 'user', content: `Build a profitable ${lang} with clear BUY, SELL, CLOSE, SL and TP logic and sound risk sizing.${idea ? ` Idea: ${idea}` : ''} Start by reading the stats in data/.` },
  ];
  for (let s = 1; s <= steps && !stopped(); s++) {
    const reply = await chatLocal(model, messages.length > 14 ? [messages[0], messages[1], ...messages.slice(-12)] : messages);
    messages.push({ role: 'assistant', content: reply });
    const { output, done } = await runCommand(dir, reply, model).catch((e) => ({ output: `Error: ${e.message}` }));
    onLog(`${reply.trim().split('\n')[0].slice(0, 120)}\n→ ${output.split('\n').slice(0, 3).join(' | ').slice(0, 200)}`);
    if (done) return onLog('Finished.');
    messages.push({ role: 'user', content: `Result:\n${output}` });
  }
  onLog(stopped() ? 'Stopped.' : 'Step limit reached.');
}