import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db';
import { seedUser, seedSession, seedTransaction } from './fixtures';

describe('fixture factories', () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
  });

  it('seedUser inserts a user and returns the row', async () => {
    const user = await seedUser(handle.db, { id: 'alice' });
    expect(user.id).toBe('alice');
    expect(user.provider).toBe('test');
    handle.client.close();
  });

  it('seedSession requires an existing user and returns a session row', async () => {
    await seedUser(handle.db, { id: 'alice' });
    const s = await seedSession(handle.db, { userId: 'alice' });
    expect(s.userId).toBe('alice');
    expect(s.id).toBeGreaterThan(0);
    handle.client.close();
  });

  it('seedTransaction defaults are sensible and overrides take effect', async () => {
    await seedUser(handle.db, { id: 'alice' });
    const t = await seedTransaction(handle.db, { userId: 'alice', amount: 12345 });
    expect(t.userId).toBe('alice');
    expect(t.amount).toBe(12345);
    expect(t.type).toBe('expense');
    handle.client.close();
  });
});
