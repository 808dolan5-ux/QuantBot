import { secrets } from 'base44:runtime';

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function getKey() {
  const pass = secrets.get('ENCRYPTION_KEY');
  if (!pass) throw new Error('ENCRYPTION_KEY is not set');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptText(plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getKey(), new TextEncoder().encode(plain));
  return { ciphertext: toB64(data), iv: toB64(iv) };
}

export async function decryptText(ciphertext, iv) {
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, await getKey(), fromB64(ciphertext));
  return new TextDecoder().decode(data);
}

// Returns the stored ApiKey record for a user/provider (service role only — clients can't read this entity)
export async function findKeyRecord(base44, userId, provider) {
  const page = await base44.asServiceRole.entities.ApiKey.filter({ user_id: userId, provider }, { limit: 1 });
  return (page.items ?? page)[0] || null;
}