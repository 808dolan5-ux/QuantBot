import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { encryptText, findKeyRecord } from '../../shared/apiKeyCrypto.ts';

const PROVIDERS = ['anthropic'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, provider, api_key } = await req.json();
    if (!PROVIDERS.includes(provider)) return Response.json({ error: 'Unknown provider' }, { status: 400 });

    const ApiKey = base44.asServiceRole.entities.ApiKey;
    const existing = await findKeyRecord(base44, user.id, provider);

    if (action === 'save') {
      const key = String(api_key || '').trim();
      if (!key.startsWith('sk-ant-') || key.length > 300) {
        return Response.json({ error: 'That does not look like a valid Anthropic API key.' }, { status: 400 });
      }
      const enc = await encryptText(key);
      const data = { user_id: user.id, provider, ...enc, last4: key.slice(-4) };
      if (existing) await ApiKey.update(existing.id, data);
      else await ApiKey.create(data);
      return Response.json({ linked: true, last4: data.last4 });
    }

    if (action === 'remove') {
      if (existing) await ApiKey.delete(existing.id);
      return Response.json({ linked: false });
    }

    if (action === 'status') {
      return Response.json(existing ? { linked: true, last4: existing.last4 } : { linked: false });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}