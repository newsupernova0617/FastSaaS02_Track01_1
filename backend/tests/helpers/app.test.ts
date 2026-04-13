import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from './db';
import { createTestApp } from './app';
import { authHeaders } from './auth';
import { seedUser } from './fixtures';

describe('createTestApp', () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    handle.client.close();
  });

  it('rejects requests with no Authorization header → 401', async () => {
    const { app, env } = createTestApp(handle);
    const res = await app.fetch(new Request('http://test/api/sessions'), env as any, {} as any);
    expect(res.status).toBe(401);
  });

  it('accepts requests with valid HS256 JWT', async () => {
    await seedUser(handle.db, { id: 'alice' });
    const { app, env } = createTestApp(handle);
    const headers = await authHeaders('alice');
    const res = await app.fetch(
      new Request('http://test/api/sessions', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hello' }),
      }),
      env as any,
      {} as any
    );
    // 200 or 201 means auth passed
    expect([200, 201]).toContain(res.status);
  });
});
