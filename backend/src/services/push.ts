type JsonWebKey = {
  key_ops?: string[];
  ext?: boolean;
  kty: string;
  x?: string;
  y?: string;
  crv?: string;
  d?: string;
  [key: string]: unknown;
};

const DEV_VAPID_PUBLIC_KEY = 'BAWAz2n9rzFl0bCGAmjZeIhIFZMYouS6vfKIbda6l1y8jDDHE2Edu1u_9cI1l-fXUTzYX5qkV4N-QiM4bNgzMjc';
const DEV_VAPID_PRIVATE_KEY_JWK: JsonWebKey = {
  key_ops: ['sign'],
  ext: true,
  kty: 'EC',
  x: 'BYDPaf2vMWXRsIYCaNl4iEgVkxii5Lq98oht1rqXXLw',
  y: 'jDDHE2Edu1u_9cI1l-fXUTzYX5qkV4N-QiM4bNgzMjc',
  crv: 'P-256',
  d: 'tH6wbypeh6CqsFm9QuKtItiA7zJpx1qeZ21_m0L_sU4',
};

export type WebPushConfig = {
  publicKey: string;
  privateKeyJwk: JsonWebKey;
  subject: string;
};

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime?: number | null;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parsePrivateKeyJwk(value: string | undefined): JsonWebKey {
  if (!value) return DEV_VAPID_PRIVATE_KEY_JWK;

  try {
    const parsed = JSON.parse(value) as JsonWebKey;
    if (!parsed || parsed.kty !== 'EC') {
      throw new Error('Invalid VAPID private key JWK');
    }
    return parsed;
  } catch (error) {
    throw new Error(`WEB_PUSH_VAPID_PRIVATE_KEY_JWK is invalid: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export function getWebPushConfig(env: {
  WEB_PUSH_VAPID_PUBLIC_KEY?: string;
  WEB_PUSH_VAPID_PRIVATE_KEY_JWK?: string;
  WEB_PUSH_SUBJECT?: string;
}): WebPushConfig {
  return {
    publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY ?? DEV_VAPID_PUBLIC_KEY,
    privateKeyJwk: parsePrivateKeyJwk(env.WEB_PUSH_VAPID_PRIVATE_KEY_JWK),
    subject: env.WEB_PUSH_SUBJECT ?? 'mailto:support@easyaibudget.com',
  };
}

async function importSigningKey(privateKeyJwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

export async function createVapidJwt(
  config: WebPushConfig,
  audience: string,
  expirationSeconds = 12 * 60 * 60
): Promise<string> {
  const signingKey = await importSigningKey(config.privateKeyJwk);
  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + expirationSeconds,
    sub: config.subject,
  })));
  const message = new TextEncoder().encode(`${header}.${payload}`);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, message));
  return `${header}.${payload}.${toBase64Url(signature)}`;
}

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  config: WebPushConfig
): Promise<{ success: boolean; status: number; ok: boolean }> {
  const audience = new URL(subscription.endpoint).origin;
  const token = await createVapidJwt(config, audience);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${config.publicKey}`,
      TTL: '60',
      Urgency: 'normal',
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(),
  });

  return {
    success: response.ok,
    status: response.status,
    ok: response.ok,
  };
}

export function generateQuickEntryToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function hashQuickEntryToken(token: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  let hex = '';
  for (const byte of digest) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function subscriptionFromJson(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}): PushSubscriptionRecord {
  return {
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    expirationTime: input.expirationTime ?? null,
  };
}

export function subscriptionEndpointKey(endpoint: string): string {
  return endpoint.trim();
}
