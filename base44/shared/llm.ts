import { decryptText, findKeyRecord } from './apiKeyCrypto.ts';
import { PROVIDER_NAMES, providerOf, callModel } from './modelCall.ts';

export { providerOf, toTurns } from './modelCall.ts';

// Calls the model with the user's own encrypted key for its provider
export async function callUserModel(base44, userId, model, system, messages, maxTokens) {
  const provider = providerOf(model);
  const record = await findKeyRecord(base44, userId, provider);
  if (!record) throw new Error(`No ${PROVIDER_NAMES[provider]} API key linked. Add one in Settings.`);
  const apiKey = await decryptText(record.ciphertext, record.iv);
  return callModel(provider, apiKey, model, system, messages, maxTokens);
}