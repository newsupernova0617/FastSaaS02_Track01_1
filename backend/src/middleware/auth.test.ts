import { describe, it, expect } from 'vitest';
import { verifyJWT } from './auth';

const SECRET = 'test-secret-for-unit-tests-only';

async function makeJWT(payload: object, secret: string, expiredAt?: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: expiredAt ?? now + 3600 };
  const toB64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const h = toB64({ alg: 'HS256', typ: 'JWT' });
  const p = toB64(full);
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${p}`));
  const s = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${s}`;
}

describe('verifyJWT', () => {
  it('returns payload for a valid token', async () => {
    const token = await makeJWT({ sub: 'user-abc' }, SECRET);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result?.sub).toBe('user-abc');
  });

  it('returns null for wrong secret', async () => {
    const token = await makeJWT({ sub: 'user-abc' }, SECRET);
    expect(await verifyJWT(token, 'wrong')).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const token = await makeJWT({ sub: 'user-abc' }, SECRET, Math.floor(Date.now() / 1000) - 60);
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('returns null for a malformed token', async () => {
    expect(await verifyJWT('not.valid', SECRET)).toBeNull();
  });
});
