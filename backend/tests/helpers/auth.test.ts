import { describe, it, expect } from 'vitest';
import { signTestJwt, authHeaders } from './auth';
import { verifyJWT } from '../../src/middleware/auth';

describe('signTestJwt', () => {
  it('produces a token that the production HS256 verifier accepts', async () => {
    const token = await signTestJwt('alice');
    const payload = await verifyJWT(token, process.env.SUPABASE_JWT_SECRET!);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('alice');
  });

  it('produces an expired token when opts.expired is true', async () => {
    const token = await signTestJwt('alice', { expired: true });
    const payload = await verifyJWT(token, process.env.SUPABASE_JWT_SECRET!);
    expect(payload).toBeNull();
  });

  it('authHeaders returns a Bearer header object', async () => {
    const headers = await authHeaders('alice');
    expect(headers.Authorization).toMatch(/^Bearer /);
  });
});
