# Test Coverage Expansion — Risk-Prioritized

**Date:** 2026-04-13
**Status:** Draft (awaiting user review)
**Scope:** Backend (`backend/src/`) only

## Goals

Bring the backend from partial test coverage to comprehensive coverage across unit, integration, and E2E layers, prioritized by security risk. Make the test suite a living security contract — every authenticated route is forced to demonstrate it filters by `userId` and rejects cross-user access.

## In Scope

- Backend (`backend/src/`) only. No Flutter or React tests.
- Four risk tiers (Tier 1 security-critical → Tier 4 E2E user journeys), implemented in order.
- Real in-memory SQLite (`@libsql/client` with `:memory:`) for any test that touches the DB. Migrations applied per test, fresh DB per test.
- LLM calls mocked at the `services/llm.ts` boundary by default. A separate "smoke" suite gated by `RUN_LLM_TESTS=1` makes real Groq calls (`llama-3.1-8b-instant`) with structural assertions only.
- Required-scenarios checklist per file as the exit criterion. Soft coverage report generated; no CI threshold.
- Backend HTTP E2E using Hono's `app.fetch()` against in-memory DB and test-signed JWTs.

## Out of Scope

- Flutter integration tests, Playwright/web E2E, CORS/production-environment tests.
- Performance/load tests, fuzz tests, mutation testing.
- Refactoring source files. If a source file is found untestable as-written, it is flagged in `docs/testing.md` as a follow-up — not fixed in this effort.
- CI coverage thresholds (only the `--coverage` report is generated).

## Success Criteria

1. Every file in the Tier 1–3 lists has a corresponding test file with all required scenarios passing.
2. E2E suite covers all user journeys listed in Section 4.
3. `npm run test` runs the full unit + integration + E2E suite in <60s without external dependencies.
4. `RUN_LLM_TESTS=1 npm run test` additionally runs the LLM smoke suite against real Groq.
5. A new developer reading the test file for any route can answer: "what is this route's security contract?"

---

## Section 2 — Test Infrastructure

### Directory Layout

```
backend/
├── src/
│   └── ... (unchanged; co-located *.test.ts stays where it is, e.g., middleware/auth.test.ts)
└── tests/
    ├── helpers/                    # NEW — shared test infrastructure
    │   ├── db.ts                   # createTestDb() — in-memory libsql + migrations applied
    │   ├── auth.ts                 # signTestJwt(userId), authHeaders(userId)
    │   ├── app.ts                  # createTestApp(env) — wires up Hono app with test bindings
    │   ├── llm-mock.ts             # mockLlmResponse() — stubs services/llm.ts callLLM
    │   └── fixtures.ts             # seedUser, seedTransaction, seedSession factories
    ├── fixtures/
    │   └── test-data.ts            # (existing) static fixture data, kept
    ├── unit/                       # NEW — pure-logic + DB-touching unit tests
    │   ├── middleware/
    │   ├── routes/
    │   └── services/
    ├── integration/                # (existing) workflow tests across multiple services
    │   ├── chat-workflow.integration.test.ts
    │   └── ai-report-workflow.integration.test.ts
    ├── e2e/                        # NEW — full HTTP pipeline via app.fetch()
    │   ├── auth.e2e.test.ts
    │   ├── chat-flow.e2e.test.ts
    │   ├── reports.e2e.test.ts
    │   └── isolation.e2e.test.ts   # cross-user access rejection
    └── llm-smoke/                  # NEW — gated by RUN_LLM_TESTS=1
        ├── ai-parse.llm.test.ts
        └── clarifications.llm.test.ts
```

The existing `tests/routes/transactions.test.ts` and `tests/services/messages.test.ts` are migrated into `tests/unit/routes/` and `tests/unit/services/` and rewritten to use the new helpers (real in-memory DB instead of hand-rolled mocks).

### Five Core Helpers

1. **`createTestDb()`** — opens a `:memory:` libsql client, applies every `.sql` file in `src/db/migrations/` in order, returns a Drizzle instance bound to it. Each test calls this in `beforeEach`.

2. **`signTestJwt(userId, opts?)`** — uses the same ES256 path as production but with a test signing key set in `setup-env.ts`. Lets tests produce real JWTs that pass `authMiddleware` without mocking it. `opts` allows expiry/issuer/audience overrides for negative tests.

3. **`createTestApp({ db, env })`** — instantiates the Hono app from `src/index.ts` with injected bindings (test DB, test `SUPABASE_JWT_SECRET`, test `ALLOWED_ORIGINS`, mocked AI provider). Returns the app for `app.fetch(request)` calls. This is the heart of the E2E layer.

4. **`mockLlmResponse(response)`** — uses `vi.spyOn(llmService, 'callLLM')` to return a canned action JSON. Most unit/integration/E2E tests use this. The `llm-smoke/` tests do **not** use it.

5. **Fixture factories** — `seedUser({ id?, email? })`, `seedSession({ userId, title? })`, `seedTransaction({ userId, amount?, ... })`. Each returns the inserted row with sensible defaults so tests stay terse.

### Vitest Configuration

- Add `vitest.config.ts` with `projects` for `unit`, `integration`, `e2e`, `llm-smoke`. The `llm-smoke` project's `include` is gated by `process.env.RUN_LLM_TESTS === '1'` (otherwise empty array → no tests collected).
- Coverage reporter: `v8`, output to `coverage/`, **no thresholds**. `npm run test:coverage` script added.
- `setup-env.ts` extended to set deterministic `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`, `AI_PROVIDER=groq` for non-LLM tests.

### Why Test JWTs Are Real, Not Mocked

The simpler alternative is `vi.mock('../middleware/auth', ...)` to bypass auth in tests. This spec rejects it: if a route forgets `c.get('userId')`, a mocked auth middleware would still let the test pass. By signing real JWTs with a test key, the auth middleware runs end-to-end in every test — exactly what catches the security bugs this entire effort is about.

---

## Section 3 — Tier 1 & 2 Required Scenarios

### Universal Scenarios for Every Authenticated Route

Not repeated below — assumed for every route in Tiers 1–3:

- Missing `Authorization` header → 401
- Malformed JWT → 401
- Expired JWT → 401
- Valid JWT, request to *another user's* resource by id → 403
- Valid JWT, happy path → 200/201

A helper `expectAuthContract(app, method, path)` runs the four negative cases in one call so per-route tests only write route-specific scenarios.

### Tier 1 — Security-critical

#### `routes/sessions.ts` — primary endpoint, full AI flow
- All universal scenarios
- `POST /api/sessions` creates session owned by JWT userId (verify DB row's `userId` matches)
- `POST /api/sessions/:id/messages` rejects if session belongs to another user → 403
- AI returns `create` → transaction inserted with correct userId, both user+AI messages saved
- AI returns `clarify` → clarification state saved with correct userId, no transaction created
- AI returns `report` → report generated, no DB write side effects beyond chat messages
- AI returns `plain_text` → only chat messages saved
- Rate limit triggers (21st AI request in a minute) → 429
- DB error during transaction insert → 500, no orphaned chat messages
- Empty/whitespace message body → 400

#### `middleware/rateLimit.ts` — abuse prevention
- 20 AI requests/min per user: 20th passes, 21st returns 429
- 10 reports/min per user: 10th passes, 11th returns 429
- Limits are *per-user*: alice's quota does not affect bob's
- Window resets after 60s (vitest fake timers)
- Different routes share or separate quotas correctly (verify against actual config)
- Non-rate-limited routes ignore the middleware

#### `services/clarifications.ts` — state machine, must filter by userId
- `getActiveClarification(db, userId)` returns null if another user has an active clarification
- `saveClarification` writes with userId from arg, never from payload
- `mergeClarification` only merges into the same user's active state
- Resolved clarification cannot be merged into again
- Concurrent clarifications for same user: last write wins (or whatever the actual contract is — verify and document)

#### `routes/ai.ts` — legacy endpoint with session ownership check
- All universal scenarios
- `POST /api/ai/action` validates session ownership before any DB write → 403 on mismatch
- Each action type (`create`/`update`/`delete`/`read`) writes/reads with correct userId
- `update`/`delete` on another user's transaction → 403 (not 404 — don't leak existence)
- Invalid action type in body → 400

#### `routes/reports.ts` — rate-limited, userId filtering
- All universal scenarios
- Report query only aggregates current user's transactions (seed bob's data, verify alice's report excludes it)
- Rate limit (10/min) triggers → 429
- Invalid month/year params → 400
- Empty result → 200 with zeroed report, not 404

### Tier 2 — Correctness-critical

#### `services/ai.ts` — `parseUserInput()` LLM action parsing
- Mocked LLM returns valid `create` JSON → returns parsed action
- Mocked LLM returns malformed JSON → falls back to `plain_text` action, does not throw
- Mocked LLM returns confidence < 0.7 → returns `clarify` action
- Mocked LLM returns unknown action type → falls back safely
- Prompt construction: includes recent chat history, user notes if present (verify against fixture)

#### `services/validation.ts` — input validation
- Each exported validator: valid input passes, each invalid case rejects with the expected error
- Edge cases: empty strings, null, undefined, wrong types, boundary values (0, negative amounts, future dates)

#### `services/sessions.ts` — session CRUD + ownership
- `getSession(db, sessionId, userId)` returns null when sessionId exists but belongs to another user
- `listSessions` only returns current user's sessions
- `createSession` always sets userId from arg
- `deleteSession` 404s on cross-user delete attempt (or returns null — match actual contract)

#### `services/reports.ts` / `services/ai-report.ts` — report generation math
- Sums by category match hand-calculated fixtures
- Date range filtering: transactions outside the month are excluded
- Soft-deleted transactions (`deletedAt != null`) are excluded
- Empty input → zeroed report, not error
- AI report narrative: mocked LLM returns text, report wraps it correctly

#### `services/context.ts` — context building for LLM
- Builds history string from recent messages, respects limit
- Includes user notes when relevant (verify selection logic)
- Filters by userId at every query

---

## Section 4 — Tier 3 & 4

### Tier 3 — Feature completeness

#### `services/user-notes.ts` — RAG note storage
- All CRUD ops filter by userId (cross-user list/get/update/delete → empty/403)
- `createNote` triggers vectorization (mock `vectorize.ts`); failure to vectorize doesn't lose the note
- Soft delete vs hard delete behavior (match actual contract)
- Note content sanitization if any (verify against source)

#### `services/vectorize.ts` — embedding generation
- Mocked embedding provider returns vector → stored with correct userId + noteId association
- Provider error → graceful failure, returns null/throws documented error
- Empty content → no-op or rejected (match contract)
- Search-by-similarity returns only current user's notes (the critical RAG isolation test)

#### `routes/users.ts` — user profile endpoint
- All universal scenarios
- `GET /me` returns only current user's profile fields, never another user's

#### `routes/user-notes.ts` — RAG note HTTP layer
- All universal scenarios
- `POST /api/user-notes` creates with userId from JWT, never body
- `GET /api/user-notes/:id` for another user's note → 403
- `DELETE` for another user's note → 403 (don't leak existence)
- List endpoint paginates and only shows current user's notes

#### `middleware/logging.ts` — request logging
- Logs include userId when present, redact sensitive headers (Authorization)
- No PII leakage in error logs
- Doesn't crash the request on logging failure

### Tier 4 — E2E user journeys

Full HTTP-pipeline tests via `app.fetch()`. Each test seeds users via fixtures, mints test JWTs, and exercises the real Hono app against an in-memory DB with mocked LLM responses (except where noted).

#### `auth.e2e.test.ts` — Authentication boundary
- Unauthenticated request to any protected route → 401
- Expired JWT across all route prefixes → 401
- Valid JWT for nonexistent user → behavior matches contract (auto-create or 401, verify which)
- CORS preflight from allowed origin → 204; from disallowed origin → blocked

#### `chat-flow.e2e.test.ts` — Primary user journey
- Alice logs in → creates session → sends "오늘 점심 만오천원" → mocked LLM returns `create` → response contains both messages → DB has transaction owned by alice
- Alice sends ambiguous message → LLM returns `clarify` → next message merges → final transaction created with merged data
- Alice sends "이번 달 식비 얼마야?" → LLM returns `report` → response contains report data, no spurious transaction insert
- Alice sends a `read` query → returns her transactions only

#### `reports.e2e.test.ts` — Reports + isolation
- Alice creates 3 transactions, bob creates 5 → alice's monthly report shows only her 3
- Report for empty month → zeroed report, 200
- Report rate limit: 11th request in a minute → 429
- Invalid month param → 400

#### `isolation.e2e.test.ts` — Cross-user attack surface (security keystone)
Each case is a separate test so a regression points at the exact failed contract.
- Alice creates session+transaction. Bob (with valid JWT) attempts to:
  - GET alice's session by id → 403
  - POST a message to alice's session → 403
  - GET alice's transaction list → returns bob's empty list, not alice's data
  - DELETE alice's transaction by id → 403
  - GET alice's user-note by id → 403
  - Vector search as bob → never returns alice's notes

### LLM Smoke Suite (gated by `RUN_LLM_TESTS=1`)

Real Groq calls, structural assertions only. ~4-6 tests.

#### `ai-parse.llm.test.ts`
- Korean: "오늘 점심 만오천원" → action type is `create`, has numeric `amount`, category is one of the known set
- Korean: "이번 달 보고서" → action type is `report`
- Ambiguous: "어제 그거" → action type is `clarify` with confidence < 0.7
- English fallback: "spent 20 on coffee" → action type is `create` (verifies prompt handles non-Korean gracefully, or documents it doesn't)

#### `clarifications.llm.test.ts`
- Initial ambiguous message → clarify; follow-up with missing details → merged action type is `create` with all required fields populated

These do NOT assert exact strings, exact category names beyond a known set, or exact confidence values. They assert *shape*.

---

## Section 5 — Deliverables, Sequencing, Risks

### Deliverables

**Code:**
1. `backend/tests/helpers/{db,auth,app,llm-mock,fixtures}.ts` — five shared helpers
2. `backend/vitest.config.ts` — projects for unit/integration/e2e/llm-smoke, gated `llm-smoke` include
3. `backend/tests/integration/setup-env.ts` — extended with deterministic test secrets
4. New test files matching the file-by-file lists in Sections 3 & 4 (~25-30 new test files total)
5. Migration of `tests/routes/transactions.test.ts` and `tests/services/messages.test.ts` to use real in-memory DB
6. `package.json` scripts: `test:unit`, `test:integration`, `test:e2e`, `test:llm`, `test:coverage`

**Docs:**
7. `docs/testing.md` — how to run each suite, how to add a new route's test (the universal-scenarios template), how to enable LLM smoke tests locally
8. Updated `CLAUDE.md` — pointer to `docs/testing.md` and a one-line statement that every new authenticated route must include the universal scenarios

**No source code changes.** If a source file is found untestable, it's flagged in `docs/testing.md` as a follow-up.

### Implementation Sequencing

The `writing-plans` skill will turn this into ordered steps. Rough order:

1. **Foundation** — vitest.config projects, helpers, fixture factories, setup-env. Validated by porting the two existing test files to use them.
2. **Tier 1** — security-critical files in priority order (`sessions.ts` route → `rateLimit` → `clarifications` → `ai.ts` route → `reports.ts` route). Each file's tests merged before moving to the next so regressions are isolated.
3. **Tier 2** — correctness-critical services.
4. **Tier 3** — RAG, user-notes, logging.
5. **Tier 4** — E2E suite, with `isolation.e2e.test.ts` written last as the capstone.
6. **LLM smoke** — gated suite + CI documentation.
7. **Docs + CLAUDE.md update.**

### Risks & Mitigations

| Risk | Mitigation |
|---|---|
| In-memory libsql behaves differently from production Turso (foreign keys, RETURNING, etc.) | Apply real migration files, not schema push. Spot-check a few tricky queries by running the same test against a local Turso file DB. Document any divergences found. |
| Real-LLM smoke tests become flaky and get disabled | Keep the suite tiny (4-6 tests), structural assertions only, gated off by default. If a test flakes twice, it gets weakened or removed — never silently retried. |
| Tests grow brittle as the schema evolves | Fixture factories centralize defaults; schema changes update factories in one place. Avoid hand-built insert objects in test bodies. |
| Universal-scenarios checklist becomes copy-paste boilerplate | `expectAuthContract(app, method, path)` runs the four universal negative cases in one call. Per-route tests only write route-specific scenarios. |
| Coverage suite slow → developers skip running it | Target <60s total for unit+integration+e2e. Each layer runnable independently. Fresh in-memory DB per test stays under budget at expected scale. If it doesn't, drop to shared-DB-with-truncate as escape hatch. |
| Test JWT signing path drifts from production verification path | Both use the same `SUPABASE_JWT_SECRET` env var and the same ES256 algorithm. Test helper imports the production verifier and round-trips a token in a self-test on suite startup. |
| Effort estimate (~30 test files, 4 tiers) is large; risk of partial completion | Risk-tiered ordering means even partial completion delivers value: finishing Tier 1 alone closes the highest-value security gaps. Each tier is independently shippable. |

### Open Follow-ups (out of scope, captured for later)

- Flutter integration tests
- Playwright web E2E
- Production CORS / environment-specific tests
- Mutation testing or fuzz testing
- A CI coverage gate (only after baseline coverage stabilizes)
