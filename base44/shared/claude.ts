import { decryptText, findKeyRecord } from './apiKeyCrypto.ts';

export const CLAUDE_MODELS = ['claude-opus-5', 'claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'];

// Returns the user's decrypted Anthropic key, or null if none is linked
export async function getAnthropicKey(base44, userId) {
  const record = await findKeyRecord(base44, userId, 'anthropic');
  if (!record) return null;
  return await decryptText(record.ciphertext, record.iv);
}

export async function callClaude(apiKey, model, system, messages, maxTokens = 8192) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(270000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Claude API: ${data.error?.message || res.status}`);
  return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}