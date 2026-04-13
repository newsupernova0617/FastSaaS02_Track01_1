# Test Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the backend from partial test coverage to comprehensive coverage across unit, integration, and E2E layers, prioritized by security risk, with every authenticated route demonstrably enforcing per-user isolation.

**Architecture:** Real in-memory libsql SQLite + real HS256-signed JWTs + mocked `callLLM` boundary for unit/integration/E2E. A separate `llm-smoke` Vitest project running inside `@cloudflare/vitest-pool-workers` exercises the real Workers AI binding when `RUN_LLM_TESTS=1`. A small `createDb(client)` refactor in `src/db/index.ts` creates the injection seam. Required-scenarios checklist per file is the exit criterion; soft coverage report is generated but not gated.

**Tech Stack:** Vitest 4.x, `@libsql/client` (`:memory:`), Drizzle ORM, Hono `app.fetch()`, `@cloudflare/vitest-pool-workers`, Web Crypto HMAC for HS256 JWT signing.

**Spec:** `docs/superpowers/specs/2026-04-13-test-coverage-design.md`

---

## Phase 0 — Baseline Verification

### Task 0: Confirm starting state

**Files:**
- Read: `backend/package.json`
- Read: `backend/vitest.config.ts` (if it exists)

- [ ] **Step 1: Run existing tests to confirm baseline green**

Run from `backend/`:
```
npm run test
```
Expected: existing tests in `tests/routes/transactions.test.ts`, `tests/services/messages.test.ts`, `tests/services/chat.test.ts`, `tests/integration/*.integration.test.ts`, and `src/middleware/auth.test.ts` all pass. Note pass count.

- [ ] **Step 2: Run type-check to confirm clean baseline**

```
npm run type-check
```
Expected: zero TypeScript errors. If errors exist on `main`, stop and surface them — do not proceed until baseline is green.

- [ ] **Step 3: Note current test count and timing for later comparison**

Capture `Test Files X passed (X)` and `Tests Y passed (Y)` and total duration. Save mentally for the success criterion (full suite must stay <60s).

---

## Phase 1 — Foundation

### Task 1: Add `createDb(client)` injection seam

**Files:**
- Modify: `backend/src/db/index.ts`

- [ ] **Step 1: Read current `src/db/index.ts`**

Current content (for reference):
```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export type Env = { /* ... */ };

export function getDb(env: Env) {
    const client = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });
    return drizzle(client, { schema });
}
```

- [ ] **Step 2: Refactor to expose `createDb(client)`**

Replace the body of the file (preserving the `Env` type unchanged) with:

```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';

export type Env = { /* ... existing Env stays the same ... */ };

export function createDb(client: Client) {
    return drizzle(client, { schema });
}

export function getDb(env: Env) {
    const client = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });
    return createDb(client);
}
```

Keep the existing `Env` type body verbatim — do not change any field names or types.

- [ ] **Step 3: Run type-check**

```
npm run type-check
```
Expected: zero errors. `getDb` callers see no signature change.

- [ ] **Step 4: Run existing tests**

```
npm run test
```
Expected: same pass count as Task 0, no regressions.

- [ ] **Step 5: Commit**

```
git add backend/src/db/index.ts
git commit -m "refactor(db): extract createDb(client) injection seam"
```

---

### Task 2: Vitest projects config + test scripts

**Files:**
- Create: `backend/vitest.config.ts` (if missing) or modify existing
- Modify: `backend/package.json`

- [ ] **Step 1: Check for existing vitest config**

Run from `backend/`:
```
ls vitest.config.ts vitest.config.js 2>&1
```
If neither exists, proceed to Step 2. If one exists, read it before modifying.

- [ ] **Step 2: Create `backend/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: [
            'src/**/*.test.ts',
            'tests/unit/**/*.test.ts',
          ],
          setupFiles: ['./tests/setup-env.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.integration.test.ts'],
          setupFiles: ['./tests/setup-env.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.e2e.test.ts'],
          setupFiles: ['./tests/setup-env.ts'],
        },
      },
      // llm-smoke project is added in Phase 6
    ],
  },
});
```

- [ ] **Step 3: Add scripts to `backend/package.json`**

In the `"scripts"` block, add (keeping `test` as the existing entry):
```json
"test:unit": "vitest run --project unit",
"test:integration": "vitest run --project integration",
"test:e2e": "vitest run --project e2e",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Move existing `setup-env.ts`**

The current `tests/integration/setup-env.ts` only loads `.env`. Move it to `tests/setup-env.ts` so all projects can share it:
```
git mv backend/tests/integration/setup-env.ts backend/tests/setup-env.ts
```

- [ ] **Step 5: Extend `tests/setup-env.ts` with deterministic test env**

Replace its contents with:
```typescript
import * as fs from 'fs';
import * as path from 'path';

function loadEnvForTests() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) process.env[key] = value;
      }
    });
  }
}

loadEnvForTests();

// Deterministic overrides for tests — these always win, so tests are
// hermetic regardless of what's in the developer's .env file.
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-please-do-not-use-in-production-x'.padEnd(64, 'x');
process.env.SUPABASE_URL = 'http://supabase.test.invalid';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.AI_PROVIDER = 'workers-ai';
process.env.ENVIRONMENT = 'test';
process.env.TURSO_DB_URL = 'file::memory:?cache=shared';
process.env.TURSO_AUTH_TOKEN = '';
```

- [ ] **Step 6: Update existing integration test imports**

The two existing files in `tests/integration/` previously imported `./setup-env`. They no longer need to — the project-level `setupFiles` handles it. Search for `setup-env` references and remove the imports if any are present:

```
grep -rn "setup-env" backend/tests
```
Remove any `import './setup-env'` lines from the integration test files.

- [ ] **Step 7: Run tests with new config**

```
npm run test
```
Expected: same pass count as Task 0. The `unit` project picks up `tests/routes/`, `tests/services/`, and `src/middleware/auth.test.ts`. Integration project picks up the existing two integration tests. E2E project finds zero tests for now (acceptable).

- [ ] **Step 8: Commit**

```
git add backend/vitest.config.ts backend/package.json backend/tests/setup-env.ts
git rm backend/tests/integration/setup-env.ts  # (already moved by git mv)
git commit -m "test: add vitest projects config + per-tier scripts"
```

---

### Task 3: `tests/helpers/db.ts` — in-memory DB with migrations

**Files:**
- Create: `backend/tests/helpers/db.ts`
- Create: `backend/tests/helpers/db.test.ts` (helper self-test)

- [ ] **Step 1: Write the failing self-test**

Create `backend/tests/helpers/db.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db';
import { users } from '../../src/db/schema';

describe('createTestDb', () => {
  it('returns a Drizzle instance bound to an in-memory libsql client with schema applied', async () => {
    const { db, client } = await createTestDb();

    // Insert a row through Drizzle
    await db.insert(users).values({ id: 'u1', provider: 'google' });

    // Read it back
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
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test:unit -- db.test
```
Expected: FAIL with "Cannot find module './db'" or similar.

- [ ] **Step 3: Implement `createTestDb`**

Create `backend/tests/helpers/db.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { createClient, type Client } from '@libsql/client';
import { createDb } from '../../src/db/index';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../src/db/migrations');

function loadMigrationStatements(): string[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // 001_, 002_, ... lexicographic = correct order

  const statements: string[] = [];
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    // libsql executeMultiple is fine with multi-statement strings, but we
    // split on `;` to give clearer error messages on failure.
    for (const raw of sql.split(';')) {
      const trimmed = raw.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
    }
  }
  return statements;
}

// Cached at module load — migrations don't change between tests.
const MIGRATION_STATEMENTS = loadMigrationStatements();

export interface TestDbHandle {
  db: ReturnType<typeof createDb>;
  client: Client;
}

export async function createTestDb(): Promise<TestDbHandle> {
  const client = createClient({ url: ':memory:' });
  for (const stmt of MIGRATION_STATEMENTS) {
    try {
      await client.execute(stmt);
    } catch (err) {
      throw new Error(
        `Migration statement failed:\n${stmt.slice(0, 200)}\n\n${(err as Error).message}`
      );
    }
  }
  const db = createDb(client);
  return { db, client };
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npm run test:unit -- db.test
```
Expected: PASS, both cases green. If migration parsing fails on any statement, fix the parser (don't change the migrations).

- [ ] **Step 5: Commit**

```
git add backend/tests/helpers/db.ts backend/tests/helpers/db.test.ts
git commit -m "test(helpers): add createTestDb with in-memory libsql + migrations"
```

---

### Task 4: `tests/helpers/auth.ts` — HS256 JWT signing

**Files:**
- Create: `backend/tests/helpers/auth.ts`
- Create: `backend/tests/helpers/auth.test.ts`

- [ ] **Step 1: Write the failing self-test**

```typescript
import { describe, it, expect } from 'vitest';
import { signTestJwt, authHeaders } from './auth';
import { verifyJWT } from '../../src/middleware/auth';

describe('signTestJwt', () => {
  it('produces a token that the production HS256 verifier accepts', async () => {
    const token = await signTestJwt('alice');
    const payload = await verifyJWT(token, process.env.SUPABASE_JWT_SECRET!);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('alice');
  });

  it('produces an expired token when opts.expired is true', async () => {
    const token = await signTestJwt('alice', { expired: true });
    const payload = await verifyJWT(token, process.env.SUPABASE_JWT_SECRET!);
    expect(payload).toBeNull();
  });

  it('authHeaders returns a Bearer header object', async () => {
    const headers = await authHeaders('alice');
    expect(headers.Authorization).toMatch(/^Bearer /);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npm run test:unit -- auth.test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper**

Create `backend/tests/helpers/auth.ts`:
```typescript
function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export interface SignOpts {
  expired?: boolean;
  expSecondsFromNow?: number;
  extraClaims?: Record<string, unknown>;
}

export async function signTestJwt(userId: string, opts: SignOpts = {}): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET must be set in test env');

  const now = Math.floor(Date.now() / 1000);
  const exp = opts.expired
    ? now - 60
    : now + (opts.expSecondsFromNow ?? 3600);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: userId, iat: now, exp, ...opts.extraClaims };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigB64 = base64url(sigBuf);

  return `${signingInput}.${sigB64}`;
}

export async function authHeaders(userId: string, opts?: SignOpts): Promise<Record<string, string>> {
  const token = await signTestJwt(userId, opts);
  return { Authorization: `Bearer ${token}` };
}
```

- [ ] **Step 4: Run test to verify pass**

```
npm run test:unit -- auth.test
```
Expected: PASS, all three cases green. This proves the test JWT round-trips through the production verifier.

- [ ] **Step 5: Commit**

```
git add backend/tests/helpers/auth.ts backend/tests/helpers/auth.test.ts
git commit -m "test(helpers): add HS256 signTestJwt that round-trips through prod verifier"
```

---

### Task 5: `tests/helpers/llm-mock.ts`

**Files:**
- Create: `backend/tests/helpers/llm-mock.ts`

- [ ] **Step 1: Implement the mock helper**

```typescript
import { vi, type MockInstance } from 'vitest';
import * as llmModule from '../../src/services/llm';

/**
 * Stub callLLM to return a fixed string.
 * Pass either a literal string (LLM raw response) or an object that will be JSON.stringified.
 * Returns the spy so tests can assert on call counts/arguments and restore later.
 */
export function mockLlmResponse(response: string | object): MockInstance {
  const text = typeof response === 'string' ? response : JSON.stringify(response);
  return vi.spyOn(llmModule, 'callLLM').mockResolvedValue(text);
}

/**
 * Restore all spies created by previous mockLlmResponse calls.
 * Call in afterEach.
 */
export function restoreLlmMock(): void {
  vi.restoreAllMocks();
}
```

- [ ] **Step 2: Confirm it compiles**

```
npm run type-check
```
Expected: no errors. (No dedicated test for this helper — it's exercised by every downstream test that uses it.)

- [ ] **Step 3: Commit**

```
git add backend/tests/helpers/llm-mock.ts
git commit -m "test(helpers): add mockLlmResponse spy"
```

---

### Task 6: `tests/helpers/fixtures.ts` — seed factories

**Files:**
- Create: `backend/tests/helpers/fixtures.ts`
- Create: `backend/tests/helpers/fixtures.test.ts`

- [ ] **Step 1: Write the failing self-test**

```typescript
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
  });

  it('seedSession requires an existing user and returns a session row', async () => {
    await seedUser(handle.db, { id: 'alice' });
    const s = await seedSession(handle.db, { userId: 'alice' });
    expect(s.userId).toBe('alice');
    expect(s.id).toBeGreaterThan(0);
  });

  it('seedTransaction defaults are sensible and overrides take effect', async () => {
    await seedUser(handle.db, { id: 'alice' });
    const t = await seedTransaction(handle.db, { userId: 'alice', amount: 12345 });
    expect(t.userId).toBe('alice');
    expect(t.amount).toBe(12345);
    expect(t.type).toBe('expense');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npm run test:unit -- fixtures.test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement fixtures**

Create `backend/tests/helpers/fixtures.ts`:
```typescript
import { users, sessions, transactions } from '../../src/db/schema';
import type { createDb } from '../../src/db/index';

type Db = ReturnType<typeof createDb>;

export async function seedUser(
  db: Db,
  overrides: { id?: string; email?: string; name?: string; provider?: string } = {}
) {
  const row = {
    id: overrides.id ?? `user-${Math.random().toString(36).slice(2, 10)}`,
    email: overrides.email ?? null,
    name: overrides.name ?? null,
    avatarUrl: null as string | null,
    provider: overrides.provider ?? 'test',
  };
  await db.insert(users).values(row);
  return row;
}

export async function seedSession(
  db: Db,
  overrides: { userId: string; title?: string }
) {
  const inserted = await db
    .insert(sessions)
    .values({
      userId: overrides.userId,
      title: overrides.title ?? 'Test Session',
    })
    .returning();
  return inserted[0];
}

export async function seedTransaction(
  db: Db,
  overrides: {
    userId: string;
    type?: 'income' | 'expense';
    amount?: number;
    category?: string;
    memo?: string | null;
    date?: string;
  }
) {
  const inserted = await db
    .insert(transactions)
    .values({
      userId: overrides.userId,
      type: overrides.type ?? 'expense',
      amount: overrides.amount ?? 10000,
      category: overrides.category ?? 'food',
      memo: overrides.memo ?? null,
      date: overrides.date ?? '2026-04-13',
    })
    .returning();
  return inserted[0];
}
```

- [ ] **Step 4: Run test to verify pass**

```
npm run test:unit -- fixtures.test
```
Expected: PASS, all three cases green.

- [ ] **Step 5: Commit**

```
git add backend/tests/helpers/fixtures.ts backend/tests/helpers/fixtures.test.ts
git commit -m "test(helpers): add seedUser/seedSession/seedTransaction factories"
```

---

### Task 7: `tests/helpers/app.ts` — test app for E2E

**Files:**
- Create: `backend/tests/helpers/app.ts`
- Create: `backend/tests/helpers/app.test.ts`

- [ ] **Step 1: Write the failing self-test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db';
import { createTestApp } from './app';
import { authHeaders } from './auth';
import { seedUser } from './fixtures';

describe('createTestApp', () => {
  let handle: TestDbHandle;
  let teardown: () => void;

  beforeEach(async () => {
    handle = await createTestDb();
  });

  afterEach(() => {
    teardown?.();
    handle.client.close();
  });

  it('serves /api/* requests with HS256 JWTs against the injected DB', async () => {
    await seedUser(handle.db, { id: 'alice' });
    const { app, env } = createTestApp(handle);
    teardown = () => {}; // app has no resources to release

    const headers = await authHeaders('alice');
    const res = await app.fetch(
      new Request('http://test/api/sessions', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hello' }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('rejects requests with no Authorization header → 401', async () => {
    const { app, env } = createTestApp(handle);
    teardown = () => {};
    const res = await app.fetch(new Request('http://test/api/sessions'), env);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npm run test:unit -- app.test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createTestApp`**

Create `backend/tests/helpers/app.ts`:
```typescript
import { vi } from 'vitest';
import * as dbModule from '../../src/db/index';
import type { TestDbHandle } from './db';

// The project is ESM ("type": "module" in package.json), so we use a static
// import of src/index. The `getDb` spy is installed BEFORE the test makes any
// fetch call — and route handlers call getDb() per request, so they pick up
// the mock as long as it's installed before the first app.fetch() invocation.
import appDefault from '../../src/index';

export interface TestAppHandle {
  app: { fetch: (req: Request, env: any, ctx?: any) => Promise<Response> };
  env: any;
}

export function createTestApp(handle: TestDbHandle): TestAppHandle {
  // Force every getDb(env) call inside route handlers to return our in-memory DB.
  // Routes call getDb(c.env) per request, so this mock is read at request time,
  // not at module-load time — installation order is therefore safe.
  vi.spyOn(dbModule, 'getDb').mockReturnValue(handle.db as any);

  const app = appDefault;

  const env = {
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET!,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS!,
    AI_PROVIDER: 'workers-ai',
    ENVIRONMENT: 'test',
    TURSO_DB_URL: 'file::memory:?cache=shared',
    TURSO_AUTH_TOKEN: '',
    AI: undefined, // mocked LLM, no real binding
  };

  return { app, env };
}
```

Note: `src/index.ts` exports a default `{ fetch(request, env, ctx) }` object, not the Hono `app` directly. The test calls `app.fetch(req, env)`.

- [ ] **Step 4: Run test to verify pass**

```
npm run test:unit -- app.test
```
Expected: PASS. If the second case fails because `vi.spyOn` from a previous test bled across, add `vi.restoreAllMocks()` in `afterEach` of the test file.

- [ ] **Step 5: Commit**

```
git add backend/tests/helpers/app.ts backend/tests/helpers/app.test.ts
git commit -m "test(helpers): add createTestApp wiring Hono app to in-memory DB"
```

---

### Task 8: `expectAuthContract` reusable assertion

**Files:**
- Create: `backend/tests/helpers/auth-contract.ts`

- [ ] **Step 1: Implement the helper**

```typescript
import { expect } from 'vitest';
import { authHeaders, signTestJwt } from './auth';
import type { TestAppHandle } from './app';

/**
 * Runs the four universal negative auth scenarios against any route.
 * Use in every authenticated route's test file:
 *
 *   await expectAuthContract(handle, 'GET', '/api/sessions');
 */
export async function expectAuthContract(
  handle: TestAppHandle,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  bodyForWrite: object = {}
): Promise<void> {
  const url = `http://test${path}`;
  const baseInit: RequestInit = method === 'GET' || method === 'DELETE'
    ? { method }
    : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyForWrite) };

  // 1. No Authorization header → 401
  {
    const res = await handle.app.fetch(new Request(url, baseInit), handle.env);
    expect(res.status, `${method} ${path}: missing auth should be 401`).toBe(401);
  }

  // 2. Malformed JWT → 401
  {
    const res = await handle.app.fetch(
      new Request(url, {
        ...baseInit,
        headers: { ...(baseInit.headers ?? {}), Authorization: 'Bearer not.a.jwt' },
      }),
      handle.env
    );
    expect(res.status, `${method} ${path}: malformed JWT should be 401`).toBe(401);
  }

  // 3. Expired JWT → 401
  {
    const expiredToken = await signTestJwt('alice', { expired: true });
    const res = await handle.app.fetch(
      new Request(url, {
        ...baseInit,
        headers: { ...(baseInit.headers ?? {}), Authorization: `Bearer ${expiredToken}` },
      }),
      handle.env
    );
    expect(res.status, `${method} ${path}: expired JWT should be 401`).toBe(401);
  }

  // 4. Wrong-issuer / missing-sub variants are out of scope here — those are
  // covered by middleware/auth.test.ts. The fourth universal scenario
  // (cross-user resource access → 403) is route-specific (needs a real seeded
  // resource owned by another user) and stays in each route's own test.
}
```

- [ ] **Step 2: Type-check**

```
npm run type-check
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```
git add backend/tests/helpers/auth-contract.ts
git commit -m "test(helpers): add expectAuthContract universal negative-auth assertion"
```

---

### Task 9: Migrate `tests/routes/transactions.test.ts` to use real DB

**Files:**
- Modify: `backend/tests/routes/transactions.test.ts` → move to `backend/tests/unit/routes/transactions.test.ts`

- [ ] **Step 1: Read current file**

Read `backend/tests/routes/transactions.test.ts` in full. Note which behaviors it tests (the "undo" endpoint based on baseline exploration).

- [ ] **Step 2: Move file to new location**

```
git mv backend/tests/routes/transactions.test.ts backend/tests/unit/routes/transactions.test.ts
```

- [ ] **Step 3: Rewrite to use `createTestDb` + `createTestApp` + fixtures**

Replace mock-based setup with real-DB setup. Pattern:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { seedUser, seedTransaction } from '../../helpers/fixtures';
import { transactions } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('POST /api/transactions/:id/undo', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    appHandle = createTestApp(dbHandle);
    await seedUser(dbHandle.db, { id: 'alice' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dbHandle.client.close();
  });

  it('restores a soft-deleted transaction owned by the caller', async () => {
    // Seed a soft-deleted tx
    const t = await seedTransaction(dbHandle.db, { userId: 'alice', amount: 15000 });
    await dbHandle.db.update(transactions)
      .set({ deletedAt: '2026-04-12T00:00:00Z' })
      .where(eq(transactions.id, t.id));

    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env
    );
    expect(res.status).toBe(200);

    const [restored] = await dbHandle.db.select().from(transactions).where(eq(transactions.id, t.id));
    expect(restored.deletedAt).toBeNull();
  });

  it('rejects undo of another user\'s transaction → 403 (or 404, match contract)', async () => {
    await seedUser(dbHandle.db, { id: 'bob' });
    const t = await seedTransaction(dbHandle.db, { userId: 'bob', amount: 99 });

    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env
    );
    expect([403, 404]).toContain(res.status);

    // Verify the actual contract by reading the route source — adjust expectation
    // to the exact status the route returns. Don't leave the OR in the final test.
  });
});
```

(The OR-of-statuses is a flag for the executor to read `routes/transactions.ts` and pin down the exact status code. **Do not commit a test that accepts two statuses.**)

- [ ] **Step 4: Add the universal contract assertion**

```typescript
import { expectAuthContract } from '../../helpers/auth-contract';

it('enforces universal auth contract on undo endpoint', async () => {
  const t = await seedTransaction(dbHandle.db, { userId: 'alice' });
  await expectAuthContract(appHandle, 'POST', `/api/transactions/${t.id}/undo`);
});
```

- [ ] **Step 5: Run the test**

```
npm run test:unit -- transactions.test
```
Expected: PASS. If a scenario fails because the route's actual behavior differs from what the old mock-based test claimed, **trust the new real-DB test** — the old one was lying.

- [ ] **Step 6: Commit**

```
git add backend/tests/unit/routes/transactions.test.ts
git commit -m "test(unit): migrate transactions undo test to real in-memory DB"
```

---

### Task 10: Migrate `tests/services/messages.test.ts` to use real DB

**Files:**
- Modify: `backend/tests/services/messages.test.ts` → `backend/tests/unit/services/messages.test.ts`

- [ ] **Step 1: Move and rewrite**

```
git mv backend/tests/services/messages.test.ts backend/tests/unit/services/messages.test.ts
```

Apply the same pattern as Task 9: replace any `mockDb` constructions with `createTestDb()`, seed via `seedUser`/`seedSession`, call the real service functions from `src/services/messages.ts`.

- [ ] **Step 2: Run**

```
npm run test:unit -- messages.test
```
Expected: PASS. Adjust seeded data until all original assertions hold against the real DB.

- [ ] **Step 3: Commit**

```
git add backend/tests/unit/services/messages.test.ts
git commit -m "test(unit): migrate messages service test to real in-memory DB"
```

---

### Task 11: Foundation gate — full suite green

- [ ] **Step 1: Run every project**

```
npm run test
```
Expected: every test (helpers self-tests + migrated routes + migrated services + existing integration + auth middleware) passes. Total time should be well under 60s.

- [ ] **Step 2: Run type-check**

```
npm run type-check
```
Expected: zero errors.

- [ ] **Step 3: Tag completion**

```
git tag -a phase-1-foundation -m "Test infra foundation complete"
```
This is a local tag — no push required. It marks a clean rollback point if Phase 2 work goes sideways.

---

## Phase 2 — Tier 1 Security-Critical Tests

For each file in Tier 1, follow the **route test template** (for routes) or **service test template** (for services) below. Each task adds one test file. Each test file: open with the universal auth contract (routes only), then one `describe` per scenario from the spec.

### Route test template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { mockLlmResponse } from '../../helpers/llm-mock';
import { seedUser, seedSession, seedTransaction } from '../../helpers/fixtures';

describe('<ROUTE NAME>', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    appHandle = createTestApp(dbHandle);
    await seedUser(dbHandle.db, { id: 'alice' });
    await seedUser(dbHandle.db, { id: 'bob' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dbHandle.client.close();
  });

  it('enforces universal auth contract', async () => {
    await expectAuthContract(appHandle, '<METHOD>', '<PATH>', /* body for write */ {});
  });

  // One it() per required scenario from the spec.
});
```

### Service test template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser, seedSession } from '../../helpers/fixtures';
// Import the service under test:
// import * as svc from '../../../src/services/<NAME>';

describe('<SERVICE NAME>', () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
    await seedUser(handle.db, { id: 'alice' });
    await seedUser(handle.db, { id: 'bob' });
  });

  afterEach(() => handle.client.close());

  // One it() per required scenario from the spec.
});
```

---

### Task 12: `routes/sessions.ts` — primary endpoint test

**Files:**
- Create: `backend/tests/unit/routes/sessions.test.ts`

**Required scenarios** (from spec Section 3, Tier 1):
- Universal auth contract on `POST /api/sessions`, `POST /api/sessions/:id/messages`, `GET /api/sessions`, `GET /api/sessions/:id`, `DELETE /api/sessions/:id`
- `POST /api/sessions` creates session owned by JWT userId (verify DB row's `userId` matches)
- `POST /api/sessions/:id/messages` rejects if session belongs to another user → 403
- AI returns `create` → transaction inserted with correct userId, both user+AI messages saved
- AI returns `clarify` → clarification state saved with correct userId, no transaction created
- AI returns `report` → report generated, no DB write side effects beyond chat messages
- AI returns `plain_text` → only chat messages saved
- Rate limit triggers (21st AI request in a minute) → 429 (use vitest fake timers)
- Empty/whitespace message body → 400

- [ ] **Step 1: Read `routes/sessions.ts` end-to-end**

Read the full file. For each scenario above, identify the exact response shape, status code, and DB side effects. Document any deviations from the spec inline (e.g., spec says "200" but route returns "201").

- [ ] **Step 2: Write the test file using the route template**

For the AI-returns-`create` scenario, the LLM mock pattern is:
```typescript
mockLlmResponse({
  type: 'create',
  payload: {
    transactionType: 'expense',
    amount: 15000,
    category: 'food',
    memo: 'lunch',
    date: '2026-04-13',
  },
  confidence: 0.95,
});
```
Then POST a message and assert: status 200/201, response body contains both `userMsg` and `aiMsg`, `transactions` table has exactly one row owned by `alice`.

For cross-user 403:
```typescript
const aliceSession = await seedSession(dbHandle.db, { userId: 'alice' });
const headers = await authHeaders('bob');
const res = await appHandle.app.fetch(
  new Request(`http://test/api/sessions/${aliceSession.id}/messages`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'hello' }),
  }),
  appHandle.env,
);
expect(res.status).toBe(403);
```

For rate limit:
```typescript
import { vi } from 'vitest';
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('rate-limits at 20 AI requests per minute per user', async () => {
  mockLlmResponse({ type: 'plain_text', payload: { message: 'ok' } });
  const session = await seedSession(dbHandle.db, { userId: 'alice' });
  const headers = await authHeaders('alice');
  for (let i = 0; i < 20; i++) {
    const res = await appHandle.app.fetch(/* POST message */, appHandle.env);
    expect(res.status, `request ${i+1}`).not.toBe(429);
  }
  const res21 = await appHandle.app.fetch(/* POST message */, appHandle.env);
  expect(res21.status).toBe(429);
});
```

Note: rate limiter state lives in module scope (`Map`). The test must ensure it starts empty for each test — which means re-importing the module fresh, OR moving the rate limiter creation behind a factory the test can reset. Investigate the rate limit module on encountering this; if no reset hook exists, **add `__resetForTests()` to the module** as a minimal source change and document it.

- [ ] **Step 3: Run**

```
npm run test:unit -- sessions.test
```
Expected: every scenario passes. Iterate until green; do not weaken assertions to avoid fixing real bugs in source.

- [ ] **Step 4: Commit**

```
git add backend/tests/unit/routes/sessions.test.ts backend/src/middleware/rateLimit.ts  # if reset hook added
git commit -m "test(unit): cover routes/sessions.ts security and AI flow scenarios"
```

---

### Task 13: `middleware/rateLimit.ts` — focused unit test

**Files:**
- Create: `backend/tests/unit/middleware/rateLimit.test.ts`

**Required scenarios:**
- 20 AI requests/min per user: 20th passes, 21st returns 429
- 10 reports/min per user: 10th passes, 11th returns 429
- Per-user isolation: alice's quota does not affect bob's
- Window resets after 60s (use vitest fake timers)
- Different limiter instances are independent

- [ ] **Step 1: Write the test**

The middleware is exported as `createRateLimiter(maxRequests, windowMs)`. Test it directly without going through Hono — construct a fake Hono context inline:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../../../src/middleware/rateLimit';

function makeCtx(userId: string) {
  const calls: any[] = [];
  return {
    get: (key: string) => (key === 'userId' ? userId : undefined),
    json: (body: any, status: number, headers?: any) => {
      const res = new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
      });
      calls.push({ body, status, headers });
      return res;
    },
    _calls: calls,
  } as any;
}

describe('createRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows up to maxRequests then returns 429', async () => {
    const limiter = createRateLimiter(3, 60_000);
    const ctx = makeCtx('alice');
    let nextCalls = 0;
    const next = async () => { nextCalls += 1; };

    for (let i = 0; i < 3; i++) await limiter(ctx, next);
    expect(nextCalls).toBe(3);

    const res = await limiter(ctx, next) as Response;
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('isolates per-user quotas', async () => {
    const limiter = createRateLimiter(2, 60_000);
    const next = async () => {};
    await limiter(makeCtx('alice'), next);
    await limiter(makeCtx('alice'), next);
    // alice exhausted; bob fresh
    const bobRes = await limiter(makeCtx('bob'), next);
    expect(bobRes).toBeUndefined(); // next() returned, not Response
  });

  it('resets the window after windowMs elapses', async () => {
    const limiter = createRateLimiter(1, 60_000);
    const next = async () => {};
    await limiter(makeCtx('alice'), next);

    const blocked = await limiter(makeCtx('alice'), next) as Response;
    expect(blocked.status).toBe(429);

    vi.advanceTimersByTime(60_001);

    const allowed = await limiter(makeCtx('alice'), next);
    expect(allowed).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run**

```
npm run test:unit -- rateLimit.test
```
Expected: PASS.

- [ ] **Step 3: Commit**

```
git add backend/tests/unit/middleware/rateLimit.test.ts
git commit -m "test(unit): cover createRateLimiter window/isolation/reset"
```

---

### Task 14: `services/clarifications.ts` — service test

**Files:**
- Create: `backend/tests/unit/services/clarifications.test.ts`

**Required scenarios** (spec Section 3, Tier 1):
- `getActiveClarification(db, userId)` returns null if another user has an active clarification
- `saveClarification` writes with userId from arg, never from payload
- `mergeClarification` only merges into the same user's active state
- Resolved clarification cannot be merged into again
- Concurrent clarifications for same user: behavior matches actual contract — read source first

- [ ] **Step 1: Read `services/clarifications.ts`** to confirm exact function signatures and the concurrency contract before writing tests.

- [ ] **Step 2: Write tests** using the service template + `seedSession` for the chat session FK.

- [ ] **Step 3: Run, fix, commit.**

```
npm run test:unit -- clarifications.test
git add backend/tests/unit/services/clarifications.test.ts
git commit -m "test(unit): cover services/clarifications.ts isolation and state machine"
```

---

### Task 15: `routes/ai.ts` — legacy endpoint test

**Files:**
- Create: `backend/tests/unit/routes/ai.test.ts`

**Required scenarios** (spec Section 3, Tier 1):
- Universal auth contract on `POST /api/ai/action`
- Validates session ownership before any DB write → 403 on mismatch
- Each action type (`create`/`update`/`delete`/`read`) writes/reads with correct userId
- `update`/`delete` on another user's transaction → 403 (don't leak existence)
- Invalid action type in body → 400

- [ ] **Step 1: Read `routes/ai.ts`** for exact request shape (which fields are in body vs path).
- [ ] **Step 2: Write the test file** using the route template.
- [ ] **Step 3: Run, fix, commit.**

```
git add backend/tests/unit/routes/ai.test.ts
git commit -m "test(unit): cover routes/ai.ts action types and ownership checks"
```

---

### Task 16: `routes/reports.ts` — reports endpoint test

**Files:**
- Create: `backend/tests/unit/routes/reports.test.ts`

**Required scenarios:**
- Universal auth contract
- Report query only aggregates current user's transactions (seed bob's data, verify alice's report excludes it)
- Rate limit (10/min) triggers → 429 (fake timers + reset hook)
- Invalid month/year params → 400
- Empty result → 200 with zeroed report, not 404

- [ ] **Step 1: Read `routes/reports.ts` + `services/reports.ts`** for exact endpoints and aggregation contract.
- [ ] **Step 2: Write tests.** For the isolation test, seed 3 alice transactions + 5 bob transactions in the same month, request alice's report, assert sums match alice-only.
- [ ] **Step 3: Run, fix, commit.**

```
git add backend/tests/unit/routes/reports.test.ts
git commit -m "test(unit): cover routes/reports.ts isolation and rate limit"
```

---

### Task 17: Tier 1 gate

- [ ] **Step 1: Full suite green**

```
npm run test
npm run type-check
```
Both must pass. Suite duration still under 60s.

- [ ] **Step 2: Tag**

```
git tag -a tier-1-complete -m "Tier 1 security-critical tests complete"
```

---

## Phase 3 — Tier 2 Correctness-Critical Tests

Each task = one test file using the templates from Phase 2. The spec's required-scenarios list per file is the checklist. Read the source file before writing the tests; do not invent behaviors.

### Task 18: `services/ai.ts` — `parseUserInput()` tests

**File:** `backend/tests/unit/services/ai.test.ts`
**Spec scenarios:** Section 3, Tier 2, `services/ai.ts` bullet.
- Mock `callLLM` via `mockLlmResponse(...)` to return each shape (valid create JSON, malformed JSON, low confidence, unknown action type).
- Assert the parser returns the right action type or falls back gracefully without throwing.
- Verify prompt construction: spy on `callLLM` and assert the messages array contains the expected history snippet.

```
git commit -m "test(unit): cover services/ai.ts parseUserInput action parsing"
```

### Task 19: `services/validation.ts` — validator tests

**File:** `backend/tests/unit/services/validation.test.ts`
**Spec scenarios:** each exported validator: valid input passes, each invalid case rejects with the expected error; boundary values (0, negative amounts, future dates).
- This is pure-function testing; no DB needed.

```
git commit -m "test(unit): cover services/validation.ts validators"
```

### Task 20: `services/sessions.ts` — service test

**File:** `backend/tests/unit/services/sessions.test.ts`
**Spec scenarios:** Section 3, Tier 2, `services/sessions.ts` bullet.

```
git commit -m "test(unit): cover services/sessions.ts CRUD + ownership"
```

### Task 21: `services/reports.ts` — service test

**File:** `backend/tests/unit/services/reports.test.ts`
**Spec scenarios:** Section 3, Tier 2, reports services bullet.
- Hand-calculated fixtures: e.g., seed five transactions with known amounts, assert the sum.
- Soft-deleted transactions excluded.

```
git commit -m "test(unit): cover services/reports.ts aggregation math"
```

### Task 22: `services/ai-report.ts` — service test

**File:** `backend/tests/unit/services/ai-report.test.ts`
**Spec scenarios:** AI report narrative wrapping with mocked LLM.

```
git commit -m "test(unit): cover services/ai-report.ts narrative generation"
```

### Task 23: `services/context.ts` — service test

**File:** `backend/tests/unit/services/context.test.ts`
**Spec scenarios:** Section 3, Tier 2, context bullet.

```
git commit -m "test(unit): cover services/context.ts history + notes selection"
```

### Task 24: Tier 2 gate

- [ ] Run `npm run test` + `npm run type-check`. Tag `tier-2-complete`.

---

## Phase 4 — Tier 3 Feature Completeness Tests

### Task 25: `services/user-notes.ts` test

**File:** `backend/tests/unit/services/user-notes.test.ts`
**Spec scenarios:** Section 4, Tier 3, user-notes service bullet.
- Mock `vectorize.ts` via `vi.spyOn` so `createNote` doesn't call out to Cloudflare.

```
git commit -m "test(unit): cover services/user-notes.ts CRUD + isolation"
```

### Task 26: `services/vectorize.ts` test

**File:** `backend/tests/unit/services/vectorize.test.ts`
- Mock the embedding provider HTTP path (`fetch`) via `vi.stubGlobal('fetch', vi.fn(...))`.
- The critical assertion: search-by-similarity filters by userId.

```
git commit -m "test(unit): cover services/vectorize.ts embedding + per-user search isolation"
```

### Task 27: `routes/users.ts` test

**File:** `backend/tests/unit/routes/users.test.ts`
- Universal auth contract.
- `GET /me` returns only current user's profile fields.

```
git commit -m "test(unit): cover routes/users.ts /me endpoint"
```

### Task 28: `routes/user-notes.ts` test

**File:** `backend/tests/unit/routes/user-notes.test.ts`
**Spec scenarios:** Section 4, Tier 3, user-notes route bullet.

```
git commit -m "test(unit): cover routes/user-notes.ts CRUD and isolation"
```

### Task 29: `middleware/logging.ts` test

**File:** `backend/tests/unit/middleware/logging.test.ts`
- Spy on `console.log`/`console.error` to assert log structure, redaction, no PII leakage.

```
git commit -m "test(unit): cover middleware/logging.ts redaction and resilience"
```

### Task 30: Tier 3 gate

- [ ] `npm run test` + `npm run type-check`. Tag `tier-3-complete`.

---

## Phase 5 — Tier 4 E2E

### Task 31: `auth.e2e.test.ts`

**File:** `backend/tests/e2e/auth.e2e.test.ts`
**Spec scenarios:** Section 4, Tier 4, auth journey.
- Loop over a list of protected route prefixes, assert all return 401 without auth.
- Test CORS preflight from allowed/disallowed origin.

```
git commit -m "test(e2e): authentication boundary across protected routes"
```

### Task 32: `chat-flow.e2e.test.ts`

**File:** `backend/tests/e2e/chat-flow.e2e.test.ts`
**Spec scenarios:** Primary user journey (create, clarify→merge, report, read).
- Each scenario: mock LLM, send message, assert response shape AND DB state.

```
git commit -m "test(e2e): primary chat flow with mocked LLM responses"
```

### Task 33: `reports.e2e.test.ts`

**File:** `backend/tests/e2e/reports.e2e.test.ts`
**Spec scenarios:** Reports + isolation + rate limit + invalid params.

```
git commit -m "test(e2e): reports aggregation, isolation, and rate limit"
```

### Task 34: `isolation.e2e.test.ts` — security keystone

**File:** `backend/tests/e2e/isolation.e2e.test.ts`
**Spec scenarios:** Section 4, Tier 4, isolation bullets — each as its own `it()` block so a regression points at the exact failed contract.

```typescript
describe('Cross-user attack surface', () => {
  beforeEach(async () => {
    // ... seed alice + bob, alice's session, alice's transaction, alice's note
  });

  it('GET alice\'s session by id as bob → 403', async () => { /* ... */ });
  it('POST a message to alice\'s session as bob → 403', async () => { /* ... */ });
  it('GET alice\'s transaction list as bob returns bob\'s empty list', async () => { /* ... */ });
  it('DELETE alice\'s transaction by id as bob → 403', async () => { /* ... */ });
  it('GET alice\'s user-note by id as bob → 403', async () => { /* ... */ });
  it('vector search as bob never returns alice\'s notes', async () => { /* ... */ });
});
```

```
git commit -m "test(e2e): cross-user isolation security keystone"
```

### Task 35: Tier 4 gate

- [ ] `npm run test` (now includes e2e). All projects green. Tag `tier-4-complete`.

---

## Phase 6 — LLM Smoke Suite

### Task 36: Add `@cloudflare/vitest-pool-workers` dependency

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install**

```
cd backend
npm install --save-dev @cloudflare/vitest-pool-workers
```
Expected: package added to `devDependencies`. Verify `package-lock.json` updated.

- [ ] **Step 2: Commit**

```
git add backend/package.json backend/package-lock.json
git commit -m "deps: add @cloudflare/vitest-pool-workers for LLM smoke suite"
```

---

### Task 37: `vitest.llm.config.ts` — workers pool config

**Files:**
- Create: `backend/vitest.llm.config.ts`

- [ ] **Step 1: Create config**

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    include: process.env.RUN_LLM_TESTS === '1'
      ? ['tests/llm-smoke/**/*.llm.test.ts']
      : [],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
      },
    },
  },
});
```

- [ ] **Step 2: Add `test:llm` script to `package.json`**

```json
"test:llm": "RUN_LLM_TESTS=1 vitest run --config vitest.llm.config.ts"
```
On Windows the env var prefix doesn't work in plain npm scripts; use `cross-env`:
```
npm install --save-dev cross-env
```
And:
```json
"test:llm": "cross-env RUN_LLM_TESTS=1 vitest run --config vitest.llm.config.ts"
```

- [ ] **Step 3: Commit**

```
git add backend/vitest.llm.config.ts backend/package.json backend/package-lock.json
git commit -m "test(llm): add workers-pool config for gated LLM smoke suite"
```

---

### Task 38: `ai-parse.llm.test.ts`

**Files:**
- Create: `backend/tests/llm-smoke/ai-parse.llm.test.ts`

- [ ] **Step 1: Write structural assertions**

```typescript
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { callLLM, getLLMConfig } from '../../src/services/llm';
import { AIService } from '../../src/services/ai';

const KNOWN_ACTION_TYPES = new Set(['create', 'read', 'update', 'delete', 'report', 'clarify', 'plain_text']);
const KNOWN_CATEGORIES = new Set(['food', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'work', 'other']);

describe('LLM smoke: ai parse', () => {
  it('parses Korean expense input as create with numeric amount', async () => {
    const ai = new AIService(getLLMConfig(env), (env as any).AI);
    const result = await ai.parseUserInput('오늘 점심 만오천원', []);
    expect(KNOWN_ACTION_TYPES.has(result.type)).toBe(true);
    if (result.type === 'create') {
      expect(typeof (result.payload as any).amount).toBe('number');
      expect(KNOWN_CATEGORIES.has((result.payload as any).category)).toBe(true);
    }
  });

  it('parses report query as report action', async () => {
    const ai = new AIService(getLLMConfig(env), (env as any).AI);
    const result = await ai.parseUserInput('이번 달 보고서', []);
    expect(['report', 'plain_text']).toContain(result.type);
  });

  it('returns clarify (or low-confidence create) for ambiguous input', async () => {
    const ai = new AIService(getLLMConfig(env), (env as any).AI);
    const result = await ai.parseUserInput('어제 그거', []);
    expect(KNOWN_ACTION_TYPES.has(result.type)).toBe(true);
  });
});
```

Note: the exact `AIService` constructor and `parseUserInput` signature must be verified by reading `src/services/ai.ts`. Adjust the test code to match the real API.

- [ ] **Step 2: Run**

```
npm run test:llm
```
Expected: PASS. Slow (real network calls). If structural assertions fail because the model returned an unexpected shape, **weaken the assertion** to the point where it still catches "model is broken" but allows acceptable variation. Don't retry.

- [ ] **Step 3: Confirm gating works**

```
npm run test
```
Expected: LLM smoke tests are NOT executed (because `RUN_LLM_TESTS` is unset, the `include` is `[]`).

- [ ] **Step 4: Commit**

```
git add backend/tests/llm-smoke/ai-parse.llm.test.ts
git commit -m "test(llm): smoke test ai parse against real Workers AI"
```

---

### Task 39: `clarifications.llm.test.ts`

**File:** `backend/tests/llm-smoke/clarifications.llm.test.ts`
- Same pattern as Task 38.
- Initial ambiguous → clarify → second message merges → final action is create with all required fields.

```
git commit -m "test(llm): smoke test clarification merge with real LLM"
```

---

## Phase 7 — Documentation

### Task 40: `docs/testing.md`

**Files:**
- Create: `docs/testing.md`

- [ ] **Step 1: Write the doc**

Cover:
- How to run each suite (`test:unit`, `test:integration`, `test:e2e`, `test:llm`, `test:coverage`).
- Universal auth contract template — the four scenarios every authenticated route must verify.
- How to add a new route's test (point at the route template in this plan).
- How to enable LLM smoke tests locally (`RUN_LLM_TESTS=1`, requires `wrangler.jsonc` Workers AI binding configured).
- The `createTestDb` + `createTestApp` + `mockLlmResponse` quickstart.
- List of any source files flagged as untestable-as-written (filled in by executor as they hit them).

- [ ] **Step 2: Update `CLAUDE.md`**

Add a one-line pointer near the "Critical Security Invariants" section:
> **Tests:** Every new authenticated route must include the universal auth contract assertion (`expectAuthContract`). See `docs/testing.md`.

- [ ] **Step 3: Commit**

```
git add docs/testing.md CLAUDE.md
git commit -m "docs: testing guide and CLAUDE.md test contract pointer"
```

---

## Phase 8 — Final Verification

### Task 41: Full suite + coverage report

- [ ] **Step 1: Run everything**

```
cd backend
npm run type-check
npm run test
npm run test:coverage
```
All must pass. Capture the coverage report (`coverage/index.html`) and skim it. Note any source files with surprisingly low coverage in `docs/testing.md` under "follow-ups".

- [ ] **Step 2: Run LLM smoke once (optional, requires Workers AI access)**

```
npm run test:llm
```
If it passes, the smoke suite is healthy. If it fails, decide per spec risks: weaken assertion, or document as known-flaky in `docs/testing.md`.

- [ ] **Step 3: Confirm timing budget**

Full unit+integration+e2e suite: **<60s**. If over budget, profile the slowest tests (`vitest --reporter verbose`) and either parallelize, share migration setup across tests, or fall back to shared-DB-with-truncate as the spec's escape hatch (revisit Section 2 of the spec).

- [ ] **Step 4: Tag completion**

```
git tag -a test-coverage-expansion-complete -m "All tiers + LLM smoke + docs done"
```

- [ ] **Step 5: Final commit (any remaining doc adjustments)**

```
git add -A
git status  # verify nothing unexpected
git commit -m "test: final adjustments and follow-up notes"  # only if there are changes
```

---

## Done

At this point:
- Every Tier 1–3 file in the spec has a test file with required scenarios green.
- E2E user journeys + isolation keystone are in place.
- LLM smoke suite gated and runnable on demand.
- `docs/testing.md` is the entry point for future contributors.
- `CLAUDE.md` enforces the universal auth contract for new routes.

Open follow-ups (out of scope, captured in `docs/testing.md`):
- Flutter integration tests
- Playwright web E2E
- Production CORS / environment-specific tests
- Mutation testing
- CI coverage gate
