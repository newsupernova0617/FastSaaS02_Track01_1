import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db';
import { createTestApp, type TestAppHandle } from './app';
import { authHeaders } from './auth';
import { seedUser } from './fixtures';

describe('createTestApp', () => {
  let handle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    handle = await createTestDb();
  });

  afterEach(() => {
    appHandle?.cleanup();
    handle.client.close();
  });

  it('rejects requests with no Authorization header → 401', async () => {
    appHandle = createTestApp(handle);
    const { app, env } = appHandle;
    const res = await app.fetch(new Request('http://test/api/sessions'), env as any, {} as any);
    expect(res.status).toBe(401);
  });

  it('accepts requests with valid HS256 JWT', async () => {
    await seedUser(handle.db, { id: 'alice' });
    appHandle = createTestApp(handle);
    const { app, env } = appHandle;
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
