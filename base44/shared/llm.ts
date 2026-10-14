import { decryptText, findKeyRecord } from './apiKeyCrypto.ts';
import { callClaude } from './claude.ts';
import { callGemini } from './gemini.ts';

const PROVIDER_NAMES = { anthropic: 'Anthropic', google: 'Google Gemini' };

const MODEL_PROVIDERS = {
  'claude-opus-5': 'anthropic',
  'claude-sonnet-4-5': 'anthropic',
  'claude-opus-4-1': 'anthropic',
  'claude-haiku-4-5': 'anthropic',
  'gemini-4-argon': 'google',
  'gemini-3.1-pro-preview': 'google',
  'gemini-3.8-flash': 'google',
};

// Provider for a model id, or null for the built-in model / unknown ids
export const providerOf = (model) => MODEL_PROVIDERS[model] || null;

// Merge consecutive same-role turns and start with a user turn (required by Claude and Gemini)
export function toTurns(history) {
  const out = [];
  for (const m of history) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else out.push({ role: m.role, content: m.content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

// Calls the model with the user's own encrypted key for its provider
export async function callUserModel(base44, userId, model, system, messages, maxTokens) {
  const provider = providerOf(model);
  const record = await findKeyRecord(base44, userId, provider);
  if (!record) throw new Error(`No ${PROVIDER_NAMES[provider]} API key linked. Add one in Settings.`);
  const apiKey = await decryptText(record.ciphertext, record.iv);
  if (provider === 'google') return callGemini(apiKey, model, system, messages);
  return callClaude(apiKey, model, system, messages, maxTokens);
}