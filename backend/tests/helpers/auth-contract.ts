import { expect } from 'vitest';
import { signTestJwt } from './auth';
import type { TestAppHandle } from './app';

export async function expectAuthContract(
  handle: TestAppHandle,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  bodyForWrite: object = {}
): Promise<void> {
  const url = `http://test${path}`;
  const contentHeader = { 'Content-Type': 'application/json' };
  const body = method === 'GET' || method === 'DELETE'
    ? undefined
    : JSON.stringify(bodyForWrite);

  // 1. No Authorization header → 401
  {
    const res = await handle.app.fetch(
      new Request(url, { method, headers: body ? contentHeader : {}, body }),
      handle.env as any,
      {} as any
    );
    expect(res.status, `${method} ${path}: missing auth should be 401`).toBe(401);
  }

  // 2. Malformed JWT → 401
  {
    const res = await handle.app.fetch(
      new Request(url, {
        method,
        headers: { Authorization: 'Bearer not.a.jwt', ...(body ? contentHeader : {}) },
        body,
      }),
      handle.env as any,
      {} as any
    );
    expect(res.status, `${method} ${path}: malformed JWT should be 401`).toBe(401);
  }

  // 3. Expired JWT → 401
  {
    const expiredToken = await signTestJwt('any-user', { expired: true });
    const res = await handle.app.fetch(
      new Request(url, {
        method,
        headers: { Authorization: `Bearer ${expiredToken}`, ...(body ? contentHeader : {}) },
        body,
      }),
      handle.env as any,
      {} as any
    );
    expect(res.status, `${method} ${path}: expired JWT should be 401`).toBe(401);
  }
}
