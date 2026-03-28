import { createMiddleware } from 'hono/factory';
import type { Env } from '../db/index';

export type Variables = { userId: string };

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function decodeBase64Url(str: string): string {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

interface JWTHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

interface JWKSKey {
  alg: string;
  crv: string;
  kid: string;
  kty: string;
  use: string;
  x: string;
  y: string;
}

// Fetch and cache JWKS from Supabase
let jwksCache: { keys: JWKSKey[] } | null = null;
let jWKSCacheTime = 0;

async function getJWKS(supabaseUrl: string): Promise<{ keys: JWKSKey[] } | null> {
  const now = Date.now();
  // Cache for 1 hour
  if (jwksCache && now - jWKSCacheTime < 3600000) {
    console.log('[JWKS] Using cached JWKS');
    return jwksCache;
  }

  try {
    const url = `${supabaseUrl}/.well-known/jwks.json`;
    console.log('[JWKS] Fetching from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[JWKS] Fetch failed with status:', res.status);
      return null;
    }
    jwksCache = await res.json();
    jWKSCacheTime = now;
    console.log('[JWKS] Fetched successfully, keys:', jwksCache.keys.length);
    return jwksCache;
  } catch (err) {
    console.error('[JWKS] Fetch exception:', err);
    return null;
  }
}

async function verifyES256(
  token: string,
  supabaseUrl: string
): Promise<{ sub: string; [key: string]: unknown } | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    // Decode header
    const headerJson = decodeBase64Url(headerB64);
    const header: JWTHeader = JSON.parse(headerJson);

    if (header.alg !== 'ES256' || !header.kid) {
      console.error('[ES256] Invalid header:', { alg: header.alg, kid: header.kid });
      return null;
    }

    // Get JWKS
    const jwks = await getJWKS(supabaseUrl);
    if (!jwks) {
      console.error('[ES256] Failed to fetch JWKS');
      return null;
    }

    // Find key by kid
    const key = jwks.keys.find(k => k.kid === header.kid);
    if (!key) {
      console.error('[ES256] Key not found for kid:', header.kid);
      console.error('[ES256] Available kids:', jwks.keys.map(k => k.kid));
      return null;
    }
    if (key.alg !== 'ES256') {
      console.error('[ES256] Key algorithm mismatch:', key.alg);
      return null;
    }

    console.log('[ES256] Found matching key');

    // Import EC public key
    const x = base64urlToBuffer(key.x);
    const y = base64urlToBuffer(key.y);

    const publicKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array([0x04, ...new Uint8Array(x), ...new Uint8Array(y)]),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    console.log('[ES256] Public key imported');

    // Verify signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlToBuffer(signatureB64);

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      data
    );

    if (!valid) {
      console.error('[ES256] Signature verification failed');
      return null;
    }

    console.log('[ES256] Signature verified');

    // Verify payload
    const payloadJson = decodeBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('[ES256] Token expired');
      return null;
    }

    console.log('[ES256] Payload verified, returning');
    return payload;
  } catch (err) {
    console.error('[ES256] Exception:', err);
    return null;
  }
}

async function verifyHS256(
  token: string,
  secret: string
): Promise<{ sub: string; [key: string]: unknown } | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlToBuffer(signatureB64);
    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;
    const payload = JSON.parse(decodeBase64Url(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyJWT(
  token: string,
  secret: string,
  supabaseUrl?: string
): Promise<{ sub: string; [key: string]: unknown } | null> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('[JWT] Invalid token format');
    return null;
  }

  try {
    // Decode header to determine algorithm
    const headerJson = decodeBase64Url(parts[0]);
    const header: JWTHeader = JSON.parse(headerJson);
    console.log('[JWT] Header:', { alg: header.alg, kid: header.kid });

    // Try ES256 first (Supabase modern auth)
    if (header.alg === 'ES256' && supabaseUrl) {
      console.log('[JWT] Attempting ES256 verification');
      const payload = await verifyES256(token, supabaseUrl);
      if (payload) {
        console.log('[JWT] ES256 verification succeeded');
        return payload;
      }
      console.log('[JWT] ES256 verification failed');
    }

    // Fall back to HS256 (legacy)
    if (header.alg === 'HS256') {
      console.log('[JWT] Attempting HS256 verification');
      const payload = await verifyHS256(token, secret);
      if (payload) {
        console.log('[JWT] HS256 verification succeeded');
        return payload;
      }
      console.log('[JWT] HS256 verification failed');
    }

    console.error('[JWT] No matching algorithm handler');
    return null;
  } catch (err) {
    console.error('[JWT] Exception:', err);
    return null;
  }
}

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.slice(7);

    // Extract Supabase URL from environment (infer from JWT or use a config variable)
    const supabaseUrl = 'https://uqvnepemplsdkkawbmdc.supabase.co';

    const payload = await verifyJWT(token, c.env.SUPABASE_JWT_SECRET, supabaseUrl);
    if (!payload) {
      console.error('[AUTH] JWT verification failed');
      return c.json({ error: 'Unauthorized', debug: 'JWT verification failed' }, 401);
    }
    c.set('userId', payload.sub);
    await next();
  }
);
