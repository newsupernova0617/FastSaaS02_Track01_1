import { vi } from 'vitest';
import * as dbModule from '../../src/db/index';
import appDefault from '../../src/index';
import type { TestDbHandle } from './db';

export interface TestAppHandle {
  app: typeof appDefault;
  env: Record<string, unknown>;
  /** Call in afterEach to restore all spies and prevent leaks between tests */
  cleanup: () => void;
}

export function createTestApp(handle: TestDbHandle): TestAppHandle {
  // Spy on getDb so every call inside route handlers returns our in-memory DB.
  // Route handlers call getDb(c.env) per request, so installing the spy before
  // the first app.fetch() call is sufficient.
  const spy = vi.spyOn(dbModule, 'getDb').mockReturnValue(handle.db as any);

  const env = {
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET!,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS!,
    AI_PROVIDER: 'workers-ai',
    ENVIRONMENT: 'test',
    TURSO_DB_URL: ':memory:',
    TURSO_AUTH_TOKEN: '',
    AI: undefined,
  };

  return {
    app: appDefault,
    env,
    cleanup: () => spy.mockRestore(),
  };
}
