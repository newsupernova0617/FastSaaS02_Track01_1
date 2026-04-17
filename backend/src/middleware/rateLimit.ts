// ============================================================
// [보안] 사용자별 요청 속도 제한 미들웨어 (Rate Limiter)
//
// 왜 필요한가?
//   악의적인 사용자가 API를 과도하게 호출하는 것을 방지합니다.
//   예: 1분에 1000번 AI 요청 → 서버 비용 폭증 + 다른 사용자 서비스 저하
//
// 작동 방식:
//   "슬라이딩 윈도우" 방식으로, 일정 시간(windowMs) 내에
//   최대 요청 횟수(maxRequests)를 초과하면 429 에러를 반환합니다.
//
// ⚠️ 한계:
//   Cloudflare Workers는 트래픽에 따라 여러 "isolate"(실행 환경)를 생성합니다.
//   각 isolate마다 별도의 메모리를 사용하므로, 전체 요청 수를 정확히 세지 못합니다.
//   → 엄격한 제한이 필요하면 Cloudflare Rate Limiting API 또는 Durable Objects로 교체해야 합니다.
//
// 사용 예:
//   const limiter = createRateLimiter(20, 60_000); // 1분에 20번까지 허용
//   router.post('/action', limiter, handler);       // 라우트에 미들웨어로 적용
// ============================================================

import type { Context, MiddlewareHandler, Next } from 'hono';
import type { Env } from '../db/index';
import type { Variables } from './auth';

// 각 사용자별 요청 카운트와 윈도우 시작 시간을 저장하는 구조
interface RateLimitEntry {
  count: number;        // 현재 윈도우 내 요청 횟수
  windowStart: number;  // 현재 윈도우가 시작된 시각 (밀리초 타임스탬프)
}

// createRateLimiter()를 호출할 때마다 독립적인 Map(저장소)을 가진 미들웨어가 생성됩니다.
// 즉, AI 라우트와 리포트 라우트가 각각 별도의 제한을 가집니다.
export function createRateLimiter(
  maxRequests: number,  // 윈도우 내 최대 허용 요청 수 (예: 20)
  windowMs: number      // 윈도우 크기 (밀리초, 예: 60_000 = 1분)
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  // 사용자 ID → 요청 카운트를 저장하는 인메모리 Map
  // ⚠️ 이 Map은 isolate별로 독립적이므로 글로벌 제한이 아닙니다
  const store = new Map<string, RateLimitEntry>();

  return async (
    c: Context<{ Bindings: Env; Variables: Variables }>,
    next: Next
  ): Promise<Response | void> => {
    // auth 미들웨어가 검증한 사용자 ID를 가져옴
    const userId = c.get('userId');

    // auth 미들웨어가 아직 실행되지 않았으면 (보호된 라우트에서는 발생하지 않아야 함)
    // 다음 미들웨어로 넘겨서 auth 미들웨어가 401을 반환하게 함
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const entry = store.get(userId);

    // 이 사용자의 첫 요청이거나, 윈도우 시간이 만료된 경우 → 새 윈도우 시작
    if (!entry || now - entry.windowStart >= windowMs) {
      store.set(userId, { count: 1, windowStart: now });

      // 메모리 누수 방지: 윈도우가 만료된 다른 사용자의 엔트리도 함께 정리
      // (장시간 실행되는 isolate에서 Map이 무한히 커지는 것을 방지)
      for (const [key, val] of store.entries()) {
        if (now - val.windowStart >= windowMs) {
          store.delete(key);
        }
      }
      // 위 정리 과정에서 현재 사용자의 키가 삭제되었을 수 있으므로 다시 설정
      store.set(userId, { count: 1, windowStart: now });

      return next();
    }

    // 윈도우 내 최대 요청 수를 초과한 경우 → 429 Too Many Requests
    if (entry.count >= maxRequests) {
      // 남은 대기 시간을 초 단위로 계산해서 Retry-After 헤더에 포함
      // 클라이언트는 이 값을 보고 언제 다시 시도할지 결정할 수 있음
      const retryAfterSec = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
      return c.json(
        { error: 'Too many requests. Please wait before sending another message.' },
        429,
        { 'Retry-After': String(retryAfterSec) }
      );
    }

    // 아직 제한에 걸리지 않았으면 카운트 증가 후 다음 핸들러로 진행
    entry.count += 1;
    return next();
  };
}
