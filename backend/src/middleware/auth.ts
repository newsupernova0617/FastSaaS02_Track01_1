import { createMiddleware } from 'hono/factory';
import type { Env } from '../db/index';

export type Variables = { userId: string };

function base64urlToBuffer(base64url: string): ArrayBuffer {
  // base64url 형식은 URL에서 안전하게 쓰기 위해 + → -, / → _로 인코딩됨
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // crypto.subtle.verify()는 표준 base64 형식(패딩 포함)을 요구하므로 = 추가
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  // atob()으로 문자열을 디코딩한 후 바이트 배열로 변환
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

// Supabase의 공개키(JWKS) 캐싱
// JWKS는 JWT 서명 검증에 필요한 공개키들의 집합
let jwksCache: { keys: JWKSKey[] } | null = null;
let jWKSCacheTime = 0;

async function getJWKS(supabaseUrl: string): Promise<{ keys: JWKSKey[] } | null> {
  const now = Date.now();
  // JWKS는 자주 변하지 않으므로 1시간 캐싱해서 불필요한 네트워크 요청 방지
  if (jwksCache && now - jWKSCacheTime < 3600000) {
    console.log('[JWKS] Using cached JWKS');
    return jwksCache;
  }

  try {
    const url = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    console.log('[JWKS] Fetching from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[JWKS] Fetch failed with status:', res.status);
      return null;
    }
    const data = await res.json() as { keys: JWKSKey[] } | null;
    if (!data || !data.keys) {
      console.error('[JWKS] Invalid JWKS response');
      return null;
    }
    jwksCache = data;
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
): Promise<{ sub: string;[key: string]: unknown } | null> {
  // JWT는 header.payload.signature 형식의 3부분으로 구성
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    // JWT 헤더 디코딩 - 어떤 알고리즘으로 서명했는지, 어떤 공개키를 써야 하는지 확인
    const headerJson = decodeBase64Url(headerB64);
    const header: JWTHeader = JSON.parse(headerJson);

    // ES256은 Elliptic Curve Digital Signature Algorithm (타원곡선 암호)
    // kid(key id)는 Supabase의 어떤 공개키로 서명했는지 가리킴
    if (header.alg !== 'ES256' || !header.kid) {
      console.error('[ES256] Invalid header:', { alg: header.alg, kid: header.kid });
      return null;
    }

    // Supabase에서 공개키 정보 가져오기 (JWKS = JSON Web Key Set)
    const jwks = await getJWKS(supabaseUrl);
    if (!jwks) {
      console.error('[ES256] Failed to fetch JWKS');
      return null;
    }

    // kid와 일치하는 공개키 찾기 (kid = key id, 고유 식별자)
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

    // ES256(P-256 타원곡선)의 공개키는 x, y 좌표로 구성
    // 0x04는 압축되지 않은 포인트 형식의 프리픽스
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

    // JWT 서명 검증: header.payload가 정말 Supabase의 개인키로 서명되었는지 확인
    // 타원곡선 암호는 공개키로 서명을 검증할 수 있음
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

    // JWT 페이로드 디코딩 및 검증
    const payloadJson = decodeBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson);

    // exp(expiration) 필드로 토큰 유효성 확인 (Unix 타임스탭프, 초 단위)
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
): Promise<{ sub: string;[key: string]: unknown } | null> {
  // HS256은 HMAC(Hash-based Message Authentication Code) 사용 - 대칭키 암호화
  // 비공개키 하나로 서명하고 검증 (ES256은 공개키/개인키 쌍)
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  try {
    // 환경변수의 secret 문자열을 HMAC 키로 변환
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    // header.payload 부분의 HMAC 검증
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlToBuffer(signatureB64);
    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;
    // 페이로드 검증 (만료 시간 확인)
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
): Promise<{ sub: string;[key: string]: unknown } | null> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('[JWT] Invalid token format');
    return null;
  }

  try {
    // JWT 헤더를 먼저 디코딩해서 사용된 알고리즘 확인
    // 서명된 데이터를 검증하려면 알고리즘에 맞는 방식으로 검증해야 함
    const headerJson = decodeBase64Url(parts[0]);
    const header: JWTHeader = JSON.parse(headerJson);
    console.log('[JWT] Header:', { alg: header.alg, kid: header.kid });

    // ES256 먼저 시도 (Supabase의 최신 인증 방식, 보안 강화)
    // 모던 Supabase는 대부분 ES256 사용
    if (header.alg === 'ES256' && supabaseUrl) {
      console.log('[JWT] Attempting ES256 verification');
      const payload = await verifyES256(token, supabaseUrl);
      if (payload) {
        console.log('[JWT] ES256 verification succeeded');
        return payload;
      }
      console.log('[JWT] ES256 verification failed');
    }

    // ES256 실패 시 HS256으로 폴백 (이전 버전 또는 레거시 시스템용)
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
    // HTTP 요청의 Authorization 헤더에서 JWT 토큰 추출
    // 형식: Authorization: Bearer <token>
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.slice(7);

    // Supabase 인스턴스의 공개키 정보를 가져오는 URL
    // ES256 검증을 위해 필요함
    const supabaseUrl = 'https://uqvnepemplsdkkawbmdc.supabase.co';

    // JWT 토큰 검증 - 유효하면 sub(사용자 ID) 필드 반환
    const payload = await verifyJWT(token, c.env.SUPABASE_JWT_SECRET, supabaseUrl);
    if (!payload) {
      console.error('[AUTH] JWT verification failed');
      return c.json({ error: 'Unauthorized', debug: 'JWT verification failed' }, 401);
    }
    // 검증된 사용자 ID를 Hono 컨텍스트에 저장해서 다음 라우트 핸들러에서 사용 가능하게 함
    c.set('userId', payload.sub);
    await next();
  }
);
