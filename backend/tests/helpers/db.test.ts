import { describe, it, expect } from 'vitest';
import { createTestDb } from './db';
import { users } from '../../src/db/schema';

describe('createTestDb', () => {
  it('returns a Drizzle instance with schema applied', async () => {
    const { db, client } = await createTestDb();
    await db.insert(users).values({ id: 'u1', provider: 'google' });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('u1');
    client.close();
  });

  it('isolates data between fresh databases', async () => {
    const a = await createTestDb();
    const b = await createTestDb();
    await a.db.insert(users).values({ id: 'alice', provider: 'google' });
    const bRows = await b.db.select().from(users);
    expect(bRows).toHaveLength(0);
    a.client.close();
    b.client.close();
  });
});
