import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../../../src/middleware/rateLimit';

function makeCtx(userId: string | undefined) {
  return {
    get: (key: string) => (key === 'userId' ? userId : undefined),
    json: (body: any, status: number, headers?: any) => {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
      });
    },
  } as any;
}

describe('createRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows up to maxRequests then returns 429', async () => {
    const limiter = createRateLimiter(3, 60_000);
    const next = vi.fn().mockResolvedValue(undefined);

    for (let i = 0; i < 3; i++) {
      const result = await limiter(makeCtx('alice-limit'), next);
      expect(result, `request ${i + 1} should not be 429`).toBeUndefined();
    }
    expect(next).toHaveBeenCalledTimes(3);

    const res = (await limiter(makeCtx('alice-limit'), next)) as Response;
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    // next should still be called only 3 times
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('isolates per-user quotas — bob not blocked when alice is exhausted', async () => {
    const limiter = createRateLimiter(2, 60_000);
    const next = vi.fn().mockResolvedValue(undefined);

    // Exhaust alice
    await limiter(makeCtx('alice-isolate'), next);
    await limiter(makeCtx('alice-isolate'), next);
    const aliceBlocked = (await limiter(makeCtx('alice-isolate'), next)) as Response;
    expect(aliceBlocked.status).toBe(429);

    // Bob is unaffected
    const bobResult = await limiter(makeCtx('bob-isolate'), next);
    expect(bobResult).toBeUndefined(); // next() was called, not a 429
  });

  it('resets the window after windowMs elapses', async () => {
    const limiter = createRateLimiter(1, 60_000);
    const next = vi.fn().mockResolvedValue(undefined);

    await limiter(makeCtx('alice-reset'), next);
    const blocked = (await limiter(makeCtx('alice-reset'), next)) as Response;
    expect(blocked.status).toBe(429);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    const allowed = await limiter(makeCtx('alice-reset'), next);
    expect(allowed).toBeUndefined(); // next() called again after window reset
  });

  it('falls through when userId is not set (auth middleware not yet run)', async () => {
    const limiter = createRateLimiter(1, 60_000);
    const ctx = { get: () => undefined, json: vi.fn() } as any;
    const next = vi.fn().mockResolvedValue(undefined);

    await limiter(ctx, next);
    expect(next).toHaveBeenCalled();
    expect(ctx.json).not.toHaveBeenCalled();
  });

  it('returns Retry-After header with a positive integer value', async () => {
    const limiter = createRateLimiter(1, 60_000);
    const next = vi.fn().mockResolvedValue(undefined);

    await limiter(makeCtx('alice-retry'), next);
    // Advance 10 seconds into the window — 50 seconds remain
    vi.advanceTimersByTime(10_000);
    const res = (await limiter(makeCtx('alice-retry'), next)) as Response;
    expect(res.status).toBe(429);
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '0', 10);
    expect(retryAfter).toBeGreaterThan(0);
  });

  it('increments count per request correctly — N-1 allowed, Nth blocked', async () => {
    const maxRequests = 5;
    const limiter = createRateLimiter(maxRequests, 60_000);
    const next = vi.fn().mockResolvedValue(undefined);

    for (let i = 0; i < maxRequests; i++) {
      const res = await limiter(makeCtx('alice-count'), next);
      expect(res, `request ${i + 1} of ${maxRequests} should pass`).toBeUndefined();
    }

    const blocked = (await limiter(makeCtx('alice-count'), next)) as Response;
    expect(blocked.status).toBe(429);
    expect(next).toHaveBeenCalledTimes(maxRequests);
  });
});
