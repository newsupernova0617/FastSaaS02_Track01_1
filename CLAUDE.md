# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FastSaaS02_Track01_1** is an AI-powered personal finance chatbot built with:
- **Backend**: Cloudflare Workers (Hono) + Turso SQLite + Drizzle ORM
- **Frontend**: Flutter (mobile) / React + Vite (web, `frontend/` directory)
- **Authentication**: Supabase (OAuth + JWT ES256)
- **AI/LLM**: Configurable provider (Workers AI, Groq, Gemini, OpenAI)

Users describe financial transactions in natural language (Korean) and the AI automatically extracts/categorizes them, generates reports, and maintains session-based chat history.

## Development Commands

### Backend (Cloudflare Workers + Hono)

```bash
cd backend
npm run dev          # Start wrangler dev on http://localhost:8787
npm run type-check   # TypeScript type checking (npx tsc --noEmit)
npm run test         # Run Vitest unit tests
npm run test:watch   # Run tests in watch mode
npm run test -- src/routes/transactions.test.ts  # Single test file
npm run deploy       # Deploy to Cloudflare Workers (production)
npm run cf-typegen   # Generate Cloudflare Worker type bindings
```

- Backend uses port 8787 by default (wrangler auto-increments if occupied)
- Local env vars go in `.dev.vars` (git-ignored); production secrets via `wrangler secret put <KEY>`

### Flutter Mobile

```bash
cd flutter_app
flutter pub get      # Install dependencies
flutter analyze      # Lint analysis
flutter run          # Run on connected device/emulator
flutter run -d chrome
flutter build apk / ios / web
```

### Frontend (React + Vite)

```bash
cd frontend
npm install && npm run dev   # http://localhost:5173
npm run build
```

### Security Scanning (Semgrep)

```bash
source venv/Scripts/activate        # Windows
# source venv/bin/activate          # macOS/Linux
semgrep --config .semgrep.yml backend/src/
```

The `.semgrep.yml` at the project root has rules for: hardcoded secrets, SQL injection, eval usage, userId from request body, and any-type in security files. See `docs/semgrep-proposal.md` for rule rationale and phased rollout plan.

## Required Environment Variables

Before running locally, set these in `backend/.dev.vars`:

```
TURSO_DB_URL=
TURSO_AUTH_TOKEN=
SUPABASE_JWT_SECRET=
SUPABASE_URL=https://your-project.supabase.co   # added 2026-04-13
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
AI_PROVIDER=groq
GROQ_API_KEY=
```

For production, `wrangler secret put` each of the above. `wrangler.jsonc` has placeholder values for non-secret vars (`SUPABASE_URL`, `ALLOWED_ORIGINS`, `AI_PROVIDER`).

## Architecture

### Backend Request Flow

```
Request
  → authMiddleware (JWT ES256 → userId into context)
  → rateLimitMiddleware (per-user in-memory, 20 req/min AI, 10 req/min reports)
  → route handler
      → AIService.parseUserInput() → LLM → action type JSON
      → execute action (DB read/write, report generation)
      → save both user + AI messages to chatMessages
  → Response { messages: [userMsg, aiMsg] }
```

### Key Backend Files

| File | Purpose |
|------|---------|
| `backend/src/middleware/auth.ts` | JWT validation, userId extraction — reads `SUPABASE_URL` from env |
| `backend/src/middleware/rateLimit.ts` | Per-user in-memory rate limiter (added 2026-04-13) |
| `backend/src/index.ts` | Route registration, CORS (env-based), startup env var validation |
| `backend/src/routes/sessions.ts` | Primary endpoint: full AI processing per session message |
| `backend/src/routes/ai.ts` | Legacy `/api/ai/action` — validates session ownership before write |
| `backend/src/services/ai.ts` | `parseUserInput()` — LLM call → action type + payload |
| `backend/src/services/llm.ts` | LLM provider config, switch via `AI_PROVIDER` env var |
| `backend/src/services/clarifications.ts` | Ambiguous input state (always filters by userId) |
| `backend/src/services/chat.ts` | `getChatHistoryBySession(db, sessionId, userId, limit?)` — userId required |
| `backend/src/db/schema.ts` | All Drizzle table definitions |

### Critical Security Invariants

**Never break these:**

1. **userId always from JWT context** — `const userId = c.get('userId')`, never from request body or params
2. **Every DB query filters by userId** — `where(and(eq(table.userId, userId), ...))`
3. **Session ownership check before write** — `getSession(db, sessionId, userId)` returns null → 403
4. **`getChatHistoryBySession` requires userId** — third parameter is mandatory, not optional
5. **Tests:** Every new authenticated route must include the universal auth contract assertion (`expectAuthContract` from `tests/helpers/auth-contract.ts`). See `docs/testing.md`.

### AI Action Types

LLM returns one of: `create` | `read` | `update` | `delete` | `report` | `clarify` | `plain_text`

Clarification flow: confidence < 0.7 → `type: 'clarify'` → state saved to `clarificationSessions` → next message merges with partial data.

### Flutter Architecture

- State: `flutter_riverpod`
- HTTP: `authenticatedDioProvider` → `AuthInterceptor` (auto-refresh on 401) → `ApiClient`
- Server contract: `POST /api/sessions/:sessionId/messages` → `{ messages: [userMsg, aiMsg] }`

## Adding a New API Endpoint

```typescript
// backend/src/routes/new-feature.ts
import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import type { Variables } from '../middleware/auth';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.get('/', async (c) => {
  const userId = c.get('userId');  // ALWAYS from JWT context
  const db = getDb(c.env);
  // ALL queries must include: where(eq(table.userId, userId))
});

export default router;
```

Register in `backend/src/index.ts`: `app.route('/api/new-feature', newFeatureRouter);`

## Database Migrations

1. Update `backend/src/db/schema.ts`
2. Create `backend/src/db/migrations/NNN_description.sql`
3. Migrations auto-run on `npm run dev` / deploy

## Switching AI Providers

In `backend/wrangler.jsonc` vars + `backend/.dev.vars`:
```
AI_PROVIDER=groq   # groq | gemini | openai | workers-ai
GROQ_API_KEY=...
GROQ_MODEL_NAME=llama-3.1-8b-instant  # optional
```

## Deployment

```bash
cd backend
wrangler secret put TURSO_DB_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put GROQ_API_KEY
npm run deploy
```

## Notes for Future Work

- **Rate Limiting**: Current in-memory limiter is per-isolate. For strict enforcement, migrate to Cloudflare Durable Objects or Rate Limiting API.
- **Report Caching**: Reports generated fresh each time; could cache by `(userId, month, type)`.
- **Session Limits**: Consider archiving old sessions to avoid unbounded list growth.
- **Undo**: Currently only supports single-step undo (one `previousState` stored).

## 2026-04-28-flutter-commented-features.md
주석화한 부분 2026-04-28-flutter-commented-features.md 에다가 추가