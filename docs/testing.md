# Backend Testing Guide

Audience: a new backend developer joining the project.

---

## 1. Quick Start

Run the entire test suite from the `backend/` directory:

```bash
cd backend
npm run test
```

This runs all unit, integration, and e2e projects via Vitest's project configuration.

---

## 2. Running Specific Suites

| Command | What it runs |
|---|---|
| `npm run test` | All projects (unit + integration + e2e) |
| `npm run test:unit` | Unit project only (`--project unit`) |
| `npm run test:integration` | Integration project only (`--project integration`) |
| `npm run test:e2e` | E2e project only (`--project e2e`) |
| `npm run test:coverage` | Full run with coverage report (requires `@vitest/coverage-v8` — see note below) |
| `npm run test:llm` | LLM smoke tests (disabled by default — see section 6) |

**Coverage note:** `@vitest/coverage-v8` is not currently installed. Install it with `npm install -D @vitest/coverage-v8` before running `test:coverage`.

To run a single test file:

```bash
npx vitest run tests/unit/routes/sessions.test.ts
```

---

## 3. Test Architecture

The suite is organized into four tiers. Each tier has its own naming convention and directory.

### Tier 1 — Unit (`tests/unit/`)

Fast, in-process tests. Route and middleware logic tested against an in-memory SQLite database. No external services. These are the primary regression guard for route behavior, auth contracts, and business logic.

File pattern: `*.test.ts`

Also includes legacy tests that have not yet been moved to `tests/unit/`:
- `tests/routes/*.test.ts`
- `tests/services/*.test.ts`
- `tests/seeds/*.test.ts`
- `tests/helpers/*.test.ts`

All of these are included in the `unit` Vitest project.

### Tier 2 — Integration (`tests/integration/`)

Multi-service workflow tests that exercise service-to-service interactions with a real in-memory database. These tests verify that service layers compose correctly.

File pattern: `*.integration.test.ts`

### Tier 3 — E2e (`tests/e2e/`)

Full-stack in-process tests. Exercises the complete request path from `app.fetch()` through middleware, route handlers, and DB writes using a real in-memory SQLite database. No network calls. These are the primary security keystone tests.

File pattern: `*.e2e.test.ts`

### Tier 4 — LLM Smoke (`tests/llm-smoke/`)

Structural validation of LLM prompt/response contracts using mocked `callLLM`. Disabled by default. Enabled via the `RUN_LLM_TESTS=1` environment variable and a separate Vitest config.

File pattern: `*.llm.test.ts`

---

## 4. Helpers Reference

All helpers live in `tests/helpers/`.

### `createTestDb()`

```typescript
import { createTestDb, type TestDbHandle } from '../helpers/db';

const handle: TestDbHandle = await createTestDb();
// handle.db  — Drizzle ORM instance backed by in-memory libsql
// handle.client — raw libsql Client; call handle.client.close() in afterEach
```

Creates a fresh in-memory libsql database and applies all migrations from `src/db/migrations/` in order. Each call produces a fully isolated database instance. Always call `handle.client.close()` in `afterEach` to free memory.

### `createTestApp(handle)`

```typescript
import { createTestApp, type TestAppHandle } from '../helpers/app';

const appHandle: TestAppHandle = createTestApp(dbHandle);
// appHandle.app — the Hono application
// appHandle.env — fake environment bindings (JWT secret, CORS, etc.)
// appHandle.cleanup() — MUST be called in afterEach
```

Installs a `vi.spyOn` on `getDb` so that every route handler returns the test database instead of connecting to Turso. The `cleanup()` method restores the spy. Forgetting `cleanup()` will cause DB state to leak between test files.

### `signTestJwt(userId, opts?)` / `authHeaders(userId)`

```typescript
import { signTestJwt, authHeaders } from '../helpers/auth';

// Get Authorization headers for a userId
const headers = await authHeaders('user-123');
// { Authorization: 'Bearer <signed HS256 token>' }

// Advanced: sign with custom options
const expiredToken = await signTestJwt('user-123', { expired: true });
const shortToken   = await signTestJwt('user-123', { expSecondsFromNow: 30 });
const withClaims   = await signTestJwt('user-123', { extraClaims: { role: 'admin' } });
```

Signs a test JWT using the `SUPABASE_JWT_SECRET` from `tests/setup-env.ts`. The `sub` claim is set to `userId`. Use `authHeaders` for the common case; use `signTestJwt` directly when you need the raw token string (e.g., for the expired-JWT scenario).

### `mockLlmResponse(response)`

```typescript
import { mockLlmResponse } from '../helpers/llm-mock';

mockLlmResponse(JSON.stringify({
  type: 'create',
  payload: { transactionType: 'expense', amount: 15000, category: 'food', memo: '점심', date: '2026-04-13' },
  confidence: 0.95,
}));
```

Installs a `vi.spyOn` on `callLLM` that returns the given string for every call during the test. Pass either a string or an object (which is serialized with `JSON.stringify`). Call `vi.restoreAllMocks()` in `afterEach` to clear the spy.

For routes that call `callLLM` multiple times in a single request (e.g., `sessions.ts` calls it twice for action determination, and then a third time for report generation), use a sequential mock:

```typescript
const llmMod = await import('../../src/services/llm');
const spy = vi.spyOn(llmMod, 'callLLM');
spy.mockResolvedValueOnce(firstResponse);
spy.mockResolvedValueOnce(secondResponse);
spy.mockResolvedValueOnce(thirdResponse);
```

### `seedUser` / `seedSession` / `seedTransaction`

```typescript
import { seedUser, seedSession, seedTransaction } from '../helpers/fixtures';

// Insert a user row
await seedUser(dbHandle.db, { id: 'alice' });

// Insert a session owned by alice
const session = await seedSession(dbHandle.db, { userId: 'alice', title: 'My Budget' });

// Insert a transaction owned by alice
const tx = await seedTransaction(dbHandle.db, {
  userId: 'alice',
  type: 'expense',
  amount: 15000,
  category: 'food',
  date: '2026-04-13',
});
```

All fields except `userId` have sensible defaults and can be omitted. The functions return the inserted row as returned by Drizzle's `.returning()`.

### `expectAuthContract(handle, method, path)`

```typescript
import { expectAuthContract } from '../helpers/auth-contract';

await expectAuthContract(appHandle, 'POST', '/api/sessions', { title: 'test' });
```

Runs three negative authentication scenarios against any route and asserts each returns `401`:

1. Missing `Authorization` header
2. Malformed JWT (not a valid token structure)
3. Expired JWT

**Not covered** by this helper (must be written per route): a valid JWT authenticated as a different user attempting to access another user's resource. That scenario requires a seeded resource owned by a different user and typically asserts `403` or `404` depending on whether the route hides resource existence. See `tests/e2e/isolation.e2e.test.ts` for examples.

---

## 5. Adding a New Route Test

Follow this pattern. The `beforeEach`/`afterEach` block, the auth contract call, and at least one cross-user isolation scenario are mandatory for every authenticated route.

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { mockLlmResponse } from '../../helpers/llm-mock';
import { seedUser, seedSession } from '../../helpers/fixtures';

describe('routes/your-feature.ts', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    appHandle = createTestApp(dbHandle);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    appHandle.cleanup();
    dbHandle.client.close();
  });

  // 1. Universal auth contract — required for every authenticated route
  describe('auth contract — GET /api/your-feature', () => {
    it('rejects missing / malformed / expired JWT with 401', async () => {
      await expectAuthContract(appHandle, 'GET', '/api/your-feature');
    });
  });

  // 2. Cross-user isolation — required, written per route
  describe('cross-user isolation', () => {
    it('returns 404 when resource belongs to another user', async () => {
      await seedUser(dbHandle.db, { id: 'alice' });
      await seedUser(dbHandle.db, { id: 'bob' });
      const aliceResource = await seedSession(dbHandle.db, { userId: 'alice' });

      const bobHeaders = await authHeaders('bob');
      const res = await appHandle.app.fetch(
        new Request(`http://test/api/your-feature/${aliceResource.id}`, { headers: bobHeaders }),
        appHandle.env as any
      );
      expect(res.status).toBe(404);
    });
  });

  // 3. Scenario test
  describe('GET /api/your-feature', () => {
    it('returns the resource for the authenticated owner', async () => {
      const userId = 'owner-user';
      await seedUser(dbHandle.db, { id: userId });
      const resource = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const res = await appHandle.app.fetch(
        new Request(`http://test/api/your-feature/${resource.id}`, { headers }),
        appHandle.env as any
      );
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.id).toBe(resource.id);
    });
  });
});
```

Place the file in `tests/unit/routes/your-feature.test.ts`. It will be picked up automatically by the `unit` Vitest project.

---

## 6. LLM Smoke Tests

LLM smoke tests validate the structural contract of LLM prompts and responses using mocked `callLLM`. They do not make real API calls.

```bash
RUN_LLM_TESTS=1 npm run test:llm
```

Or using the cross-env wrapper already configured in `package.json`:

```bash
npm run test:llm
```

The `test:llm` script sets `RUN_LLM_TESTS=1` automatically via `cross-env`.

**Vitest 4.x / Workers pool incompatibility:** `@cloudflare/vitest-pool-workers` requires Vitest 2.x or earlier. This project uses Vitest 4.x (`^4.1.2`). As a result, the Workers pool (`defineWorkersConfig`) cannot be used. The LLM smoke tests are written against the Node.js pool with mocked `callLLM`. To run real LLM calls against the Workers runtime, either:

- Downgrade Vitest to `^2.x` and switch to `defineWorkersConfig` in `vitest.llm.config.ts`, or
- Run `npm run dev` (wrangler dev) and exercise the endpoints via `curl` or an external test runner.

---

## 7. Known Pre-existing Test Failures

Two test files in the legacy `tests/routes/` and `tests/services/` directories have pre-existing failures that were present before this test coverage expansion. They are not regressions.

**`tests/routes/ai.test.ts`**

All tests in this file fail at runtime with a mock chain error. The file uses `vi.mock('../../src/db/index')` combined with a module-level shared mock function. When the route handler calls `getDb`, the mock does not return a usable database object, and the chain of Drizzle calls (`select().from().where()...`) throws. The mock setup predates the `createTestDb` + `createTestApp` pattern and would need to be rewritten using that pattern to pass.

**`tests/services/ai-report.test.ts`**

All tests in this file fail with `Workers AI binding not available in environment`. The test constructs `AIReportService` with a fake API key but does not set `AI_PROVIDER` in the test environment. The `callLLM` function defaults to `workers-ai`, which requires a Cloudflare `AI` binding that is `undefined` in the Node.js test environment. The fix is to mock `callLLM` via `mockLlmResponse` before instantiating the service, or provide a Workers AI binding in the test environment.

**Two integration test files** also fail due to the same broken mock chain pattern:

- `tests/integration/ai-report-workflow.integration.test.ts`
- `tests/integration/chat-workflow.integration.test.ts`

These files mock the `getChatHistoryBySession` signature with a two-argument call, but the production function now requires three arguments (`db`, `sessionId`, `userId`). The mocks resolve successfully, but the underlying Drizzle query fails when the real DB path is taken.

---

## 8. Bug Found During Testing

A Drizzle query chaining bug was identified in `ReportService.getReports` (`backend/src/services/reports.ts`) and documented in `tests/e2e/reports.e2e.test.ts`.

When a `month` query parameter is provided, the service calls `.where()` twice on the same Drizzle query builder. Drizzle ORM does not merge multiple `.where()` calls; the second call replaces the first, which produces invalid SQL (`near ')': syntax error`) with the libsql driver, and the route handler returns `500`.

The test at line 132 of `tests/e2e/reports.e2e.test.ts` documents the current broken behavior:

```typescript
it('month query param with invalid value → 500 (Drizzle double-.where() bug)', async () => {
```

The TODO comment in that test file reads:

> fix getReports to use a single and(...) condition, then change this assertion to expect 200 with an empty array.

The fix is to merge both conditions into a single `.where(and(eq(reports.userId, userId), like(reports.createdAt, monthPattern)))` call.

---

## 9. Follow-ups

- **Flutter integration tests:** The Flutter app has no automated API contract tests. Adding a set of widget tests against a mock server would catch mobile-side contract drift.
- **Playwright web E2e:** The React frontend in `frontend/` has no browser-level E2e tests. Playwright with a local wrangler dev server would cover the full user journey.
- **CI coverage gate:** `@vitest/coverage-v8` is not installed. Once installed, add a `test:coverage` step to the CI pipeline with a minimum branch coverage threshold (suggested: 70%) to prevent regressions in new routes.
- **Migrate legacy test files:** `tests/routes/`, `tests/services/`, and `tests/seeds/` contain older tests that predated the `createTestDb`/`createTestApp` pattern. Migrating them to `tests/unit/` and using the helper pattern would fix the pre-existing failures in `ai.test.ts` and `ai-report.test.ts`.
