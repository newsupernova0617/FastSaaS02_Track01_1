import { eq } from 'drizzle-orm';

import { getDb, type Env } from '../db/index';
import { userSubscriptions } from '../db/schema';

type SubscriptionStatus = 'active' | 'expired' | 'canceled' | 'pending' | 'revoked' | 'unknown';
type Plan = 'free' | 'paid';

export interface VerifyGooglePlayPurchaseInput {
  productId: string;
  purchaseToken: string;
}

export interface GooglePlaySubscriptionRecord {
  platform: 'android';
  productId: string;
  purchaseToken: string;
  status: SubscriptionStatus;
  plan: Plan;
  expiresAt: string | null;
  autoRenewing: boolean;
  rawProviderData: string;
  lastVerifiedAt: string;
}

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleSubscriptionV2Response {
  subscriptionState?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: {
      autoRenewEnabled?: boolean;
    };
  }>;
}

interface PubSubPushEnvelope {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

interface RtdnPayload {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
  testNotification?: Record<string, unknown>;
}

interface PubSubJwtHeader {
  alg: string;
  kid?: string;
}

interface PubSubJwtPayload {
  aud?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
}

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_PLAY_API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const GOOGLE_PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs';

let googleCertsCache: Record<string, string> | null = null;
let googleCertsCacheTime = 0;

interface BillingLogContext {
  notificationType?: number;
  purchaseToken?: string;
  productId?: string;
  reason?: string;
}

export async function verifyGooglePlaySubscription(
  env: Env,
  input: VerifyGooglePlayPurchaseInput,
): Promise<GooglePlaySubscriptionRecord> {
  assertGooglePlayEnv(env);

  const accessToken = await fetchGoogleAccessToken(env);
  const packageName = env.GOOGLE_PLAY_PACKAGE_NAME!;
  const url =
    `${GOOGLE_PLAY_API_BASE}/applications/${encodeURIComponent(packageName)}` +
    `/purchases/subscriptionsv2/tokens/${encodeURIComponent(input.purchaseToken)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Play verification failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as GoogleSubscriptionV2Response;
  const lineItem = payload.lineItems?.find((item) => item.productId === input.productId);
  if (!lineItem) {
    throw new Error(`Product ${input.productId} not found in purchase token`);
  }

  const status = mapSubscriptionState(payload.subscriptionState);
  return {
    platform: 'android',
    productId: input.productId,
    purchaseToken: input.purchaseToken,
    status,
    plan: status === 'active' ? 'paid' : 'free',
    expiresAt: lineItem.expiryTime ?? null,
    autoRenewing: lineItem.autoRenewingPlan?.autoRenewEnabled ?? false,
    rawProviderData: JSON.stringify(payload),
    lastVerifiedAt: new Date().toISOString(),
  };
}

export function derivePlanFromSubscription(
  subscription: Pick<GooglePlaySubscriptionRecord, 'status' | 'expiresAt' | 'productId' | 'platform'> | null,
) {
  if (!subscription) {
    return {
      plan: 'free' as Plan,
      status: 'unknown' as SubscriptionStatus,
      platform: undefined,
      productId: undefined,
      expiresAt: undefined,
    };
  }

  const expiresAtDate = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  const isActive =
    subscription.status === 'active' &&
    expiresAtDate != null &&
    !Number.isNaN(expiresAtDate.getTime()) &&
    expiresAtDate.getTime() > Date.now();

  return {
    plan: isActive ? ('paid' as Plan) : ('free' as Plan),
    status: subscription.status,
    platform: subscription.platform,
    productId: subscription.productId,
    expiresAt: subscription.expiresAt ?? undefined,
  };
}

export async function handleGooglePlayRtdn(env: Env, request: Request): Promise<{
  accepted: boolean;
  ignored?: boolean;
  reason?: string;
}> {
  await verifyPubSubPushRequest(env, request);

  const envelope = (await request.json()) as PubSubPushEnvelope;
  const payload = decodePubSubPayload(envelope);
  const notificationType = payload.subscriptionNotification?.notificationType;
  const purchaseToken = payload.subscriptionNotification?.purchaseToken;
  const productId = payload.subscriptionNotification?.subscriptionId;

  if (payload.testNotification) {
    logBillingEvent('RTDN ignored', {
      notificationType,
      purchaseToken,
      productId,
      reason: 'test notification',
    });
    return { accepted: true, ignored: true, reason: 'test notification' };
  }

  if (!purchaseToken || !productId) {
    logBillingEvent('RTDN ignored', {
      notificationType,
      purchaseToken,
      productId,
      reason: 'missing subscription payload',
    });
    return { accepted: true, ignored: true, reason: 'missing subscription payload' };
  }

  const db = getDb(env);
  const [existing] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.purchaseToken, purchaseToken))
    .limit(1);

  if (!existing) {
    logBillingEvent('RTDN ignored', {
      notificationType,
      purchaseToken,
      productId,
      reason: 'purchase token not found locally',
    });
    return { accepted: true, ignored: true, reason: 'purchase token not found locally' };
  }

  const verified = await verifyGooglePlaySubscription(env, {
    productId,
    purchaseToken,
  });

  await db
    .update(userSubscriptions)
    .set({
      productId: verified.productId,
      status: verified.status,
      plan: verified.plan,
      expiresAt: verified.expiresAt,
      autoRenewing: verified.autoRenewing,
      rawProviderData: verified.rawProviderData,
      lastVerifiedAt: verified.lastVerifiedAt,
      updatedAt: verified.lastVerifiedAt,
    })
    .where(eq(userSubscriptions.purchaseToken, purchaseToken));

  logBillingEvent('RTDN processed', {
    notificationType,
    purchaseToken,
    productId,
  });
  return { accepted: true };
}

function assertGooglePlayEnv(env: Env) {
  const missing = [
    'GOOGLE_PLAY_PACKAGE_NAME',
    'GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY',
  ].filter((key) => !env[key as keyof Env]);

  if (missing.length > 0) {
    throw new Error(`Google Play billing not configured: ${missing.join(', ')}`);
  }
}

async function verifyPubSubPushRequest(env: Env, request: Request): Promise<void> {
  const expectedAudience = env.GOOGLE_PUBSUB_PUSH_AUDIENCE;
  const expectedEmail = env.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL;

  if (env.ENVIRONMENT === 'test') {
    return;
  }

  if (!expectedAudience || !expectedEmail) {
    const message =
      'Missing Pub/Sub RTDN auth configuration: GOOGLE_PUBSUB_PUSH_AUDIENCE, GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL';
    console.error(`[Billing] ${message}`);
    throw new Error(message);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing Pub/Sub bearer token');
  }

  const token = authHeader.slice(7);
  const claims = await verifyGoogleOidcToken(token);

  if (claims.aud !== expectedAudience) {
    throw new Error('Invalid Pub/Sub audience');
  }
  if (claims.email !== expectedEmail || claims.email_verified !== true) {
    throw new Error('Invalid Pub/Sub service account');
  }
  if (!claims.iss || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) {
    throw new Error('Invalid Pub/Sub issuer');
  }
}

async function fetchGoogleAccessToken(env: Env): Promise<string> {
  if (env.ENVIRONMENT === 'test' && env.GOOGLE_PLAY_ACCESS_TOKEN) {
    return env.GOOGLE_PLAY_ACCESS_TOKEN;
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = await signServiceAccountJwt({
    issuer: env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL!,
    privateKeyPem: env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY!,
    scope: GOOGLE_PLAY_SCOPE,
    audience: GOOGLE_TOKEN_ENDPOINT,
    issuedAt: now,
    expiresAt: now + 3600,
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google OAuth token exchange failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as GoogleTokenResponse;
  return payload.access_token;
}

async function signServiceAccountJwt({
  issuer,
  privateKeyPem,
  scope,
  audience,
  issuedAt,
  expiresAt,
}: {
  issuer: string;
  privateKeyPem: string;
  scope: string;
  audience: string;
  issuedAt: number;
  expiresAt: number;
}): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: issuer,
    scope,
    aud: audience,
    iat: issuedAt,
    exp: expiresAt,
  };

  const unsignedToken = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(payload)}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

function mapSubscriptionState(state?: string): SubscriptionStatus {
  switch (state) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'active';
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'pending';
    case 'SUBSCRIPTION_STATE_CANCELED':
      return 'canceled';
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'expired';
    case 'SUBSCRIPTION_STATE_PENDING':
      return 'pending';
    case 'SUBSCRIPTION_STATE_REVOKED':
      return 'revoked';
    default:
      return 'unknown';
  }
}

function decodePubSubPayload(envelope: PubSubPushEnvelope): RtdnPayload {
  const data = envelope.message?.data;
  if (!data) {
    throw new Error('Pub/Sub payload missing message.data');
  }

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as RtdnPayload;
}

async function verifyGoogleOidcToken(token: string): Promise<PubSubJwtPayload> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid JWT format');
  }

  const header = JSON.parse(decodeBase64Url(headerB64)) as PubSubJwtHeader;
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Pub/Sub JWT header');
  }

  const certificates = await getGoogleCerts();
  const certPem = certificates[header.kid];
  if (!certPem) {
    throw new Error('Pub/Sub signing key not found');
  }

  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(certPem, 'CERTIFICATE'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signatureBytes = base64UrlToUint8Array(signatureB64);
  const signedBytes = new Uint8Array(
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signatureBytes as any,
    signedBytes as any,
  );

  if (!valid) {
    throw new Error('Invalid Pub/Sub JWT signature');
  }

  const payload = JSON.parse(decodeBase64Url(payloadB64)) as PubSubJwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Pub/Sub JWT expired');
  }

  return payload;
}

async function getGoogleCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googleCertsCache && now - googleCertsCacheTime < 3600000) {
    return googleCertsCache;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Google OIDC certs (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as Record<string, string>;
  googleCertsCache = payload;
  googleCertsCacheTime = now;
  return payload;
}

function pemToArrayBuffer(pem: string, label = 'PRIVATE KEY'): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, '\n');
  const base64 = normalized
    .replace(`-----BEGIN ${label}-----`, '')
    .replace(`-----END ${label}-----`, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlEncodeJson(value: Record<string, unknown>): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
  return atob(padded);
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const binary = decodeBase64Url(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

function logBillingEvent(message: string, context: BillingLogContext) {
  const summary = {
    notificationType: context.notificationType,
    productId: context.productId,
    reason: context.reason,
    purchaseTokenHash: context.purchaseToken
      ? simpleHash(context.purchaseToken)
      : undefined,
  };
  console.log(`[Billing] ${message}: ${JSON.stringify(summary)}`);
}

function simpleHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}
