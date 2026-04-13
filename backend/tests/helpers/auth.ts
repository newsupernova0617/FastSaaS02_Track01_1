function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export interface SignOpts {
  expired?: boolean;
  expSecondsFromNow?: number;
  extraClaims?: Record<string, unknown>;
}

export async function signTestJwt(userId: string, opts: SignOpts = {}): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET must be set in test env');

  const now = Math.floor(Date.now() / 1000);
  const exp = opts.expired
    ? now - 60
    : now + (opts.expSecondsFromNow ?? 3600);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: userId, iat: now, exp, ...opts.extraClaims };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigB64 = base64url(sigBuf);

  return `${signingInput}.${sigB64}`;
}

export async function authHeaders(userId: string, opts?: SignOpts): Promise<Record<string, string>> {
  const token = await signTestJwt(userId, opts);
  return { Authorization: `Bearer ${token}` };
}
