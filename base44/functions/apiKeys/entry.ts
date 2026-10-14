import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { encryptText, findKeyRecord } from '../../shared/apiKeyCrypto.ts';
import { KEY_PROVIDERS, keyError } from '../../shared/keyRules.ts';

// { anthropic: {linked, last4}, google: {linked, last4} } for the user
async function statusMap(base44, userId) {
  const page = await base44.asServiceRole.entities.ApiKey.filter({ user_id: userId }, { limit: 10, fields: ['provider', 'last4'] });
  const out = Object.fromEntries(Object.keys(KEY_PROVIDERS).map((p) => [p, { linked: false }]));
  for (const r of page.items ?? page) if (out[r.provider]) out[r.provider] = { linked: true, last4: r.last4 };
  return out;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, provider, api_key } = await req.json();
    if (action === 'status') return Response.json(await statusMap(base44, user.id));
    if (!KEY_PROVIDERS[provider]) return Response.json({ error: 'Unknown provider' }, { status: 400 });

    const ApiKey = base44.asServiceRole.entities.ApiKey;
    const existing = await findKeyRecord(base44, user.id, provider);

    if (action === 'save') {
      const key = String(api_key || '').trim();
      const invalid = keyError(provider, key);
      if (invalid) return Response.json({ error: invalid }, { status: 400 });
      const enc = await encryptText(key);
      const data = { user_id: user.id, provider, ...enc, last4: key.slice(-4) };
      if (existing) await ApiKey.update(existing.id, data);
      else await ApiKey.create(data);
      return Response.json(await statusMap(base44, user.id));
    }

    if (action === 'remove') {
      if (existing) await ApiKey.delete(existing.id);
      return Response.json(await statusMap(base44, user.id));
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}