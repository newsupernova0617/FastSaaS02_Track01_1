# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FastSaaS02_Track01_1** is an AI-powered personal finance chatbot built with:
- **Backend**: Cloudflare Workers (Hono) + Turso SQLite + Drizzle ORM
- **Frontend**: Flutter (mobile) / React + Vite (web, frontend directory)
- **Authentication**: Supabase (OAuth + JWT ES256)
- **AI/LLM**: Configurable AI provider (Workers AI, Groq, Gemini, OpenAI)
- **Database**: Serverless SQLite with Drizzle ORM + automatic migrations

Users describe financial transactions in natural language (Korean) and the AI automatically extracts/categorizes them, generates reports, and maintains session-based chat history.

## Development Commands

### Backend (Cloudflare Workers + Hono)

```bash
cd backend

# Development
npm run dev              # Start wrangler dev on http://localhost:8787
npm run type-check      # TypeScript type checking (npx tsc --noEmit)
npm run test            # Run Vitest unit tests
npm run test:watch      # Run tests in watch mode

# Deployment & Config
npm run deploy          # Deploy to Cloudflare Workers (production)
npm run cf-typegen      # Generate Cloudflare Worker type bindings
```

**Key Notes:**
- Backend uses port 8787 by default (check terminal if port is occupied; wrangler auto-increments to 8788, etc.)
- Environment variables (secrets, API keys) go in `.dev.vars` for local dev (git-ignored)
- Production secrets are set via `wrangler secret put <KEY>` and stored in Cloudflare dashboard

### Frontend (Flutter Mobile)

```bash
cd flutter_app

# Development
flutter pub get         # Install dependencies
flutter analyze         # Lint analysis
flutter run            # Run on connected device/emulator
flutter run -d chrome  # Run on Chrome (web)

# Build
flutter build apk      # Android APK
flutter build ios      # iOS (requires macOS)
flutter build web      # Web build
```

**Key Notes:**
- Flutter app is primarily mobile (Android/iOS) but can run on web via Chrome
- Uses `flutter_riverpod` for state management
- API calls go through `ApiClient` with automatic JWT token injection from `AuthInterceptor`

### Frontend (React + Vite Web - if applicable)

```bash
cd frontend

# Development
npm install             # Install dependencies (first time)
npm run dev            # Start Vite dev server on http://localhost:5173
npm run build          # Production build to dist/
npm run preview        # Preview production build locally
```

## Project Architecture

### Backend Structure (Backend: Cloudflare Workers)

```
backend/src/
├── index.ts              # Main Hono app, route registration
├── db/
│   ├── schema.ts         # Drizzle ORM table definitions (users, transactions, chatMessages, sessions, etc.)
│   ├── index.ts          # Database connection & initialization
│   └── migrations/       # SQL migration files
├── middleware/
│   ├── auth.ts           # JWT validation + userId extraction + per-user data filtering
│   └── logging.ts        # Request/response logging
├── routes/
│   ├── ai.ts             # POST /api/ai/action (single AI message processing)
│   ├── sessions.ts       # Session-based chat (POST /sessions/:id/messages with full AI processing)
│   ├── transactions.ts   # Transaction CRUD (create, read, update, delete)
│   ├── reports.ts        # Financial report routes
│   ├── user-notes.ts     # User notes endpoints
│   └── users.ts          # User profile routes
├── services/
│   ├── ai.ts             # AIService: parse user input → determine action type (create/read/update/delete/report/clarify)
│   ├── ai-report.ts      # AIReportService: generate financial analysis reports
│   ├── chat.ts           # Message persistence helpers
│   ├── clarifications.ts # Ambiguous input handling (ask user for missing fields)
│   ├── context.ts        # RAG context retrieval (knowledge base, recent transactions)
│   ├── llm.ts            # LLM provider config (Workers AI, Groq, Gemini, OpenAI)
│   ├── messages.ts       # AI response message generation
│   ├── sessions.ts       # Session CRUD operations
│   ├── validation.ts     # Input validation (Zod schemas)
│   └── vectorize.ts      # Cloudflare Vectorize integration (embeddings)
└── types/
    └── ai.ts             # TypeScript types for AI actions, payloads, etc.
```

### Key Backend Concepts

**AI Action Flow:**
1. User sends message → `POST /api/sessions/:sessionId/messages`
2. `AIService.parseUserInput()` analyzes user text using LLM
3. LLM returns JSON with `type` (create/read/update/delete/report/clarify/plain_text) + `payload`
4. Route handler executes the action (e.g., create transaction, query data, generate report)
5. AI response message saved to `chatMessages` table
6. Both user + AI messages returned to client

**Auth & Data Isolation:**
- JWT validated in `authMiddleware` → userId extracted from token `sub` claim
- **Every DB query filters by userId** using `where(and(eq(table.userId, userId), ...))`
- userId is server-enforced, not taken from request body → prevents cross-user data access
- See `backend_user_data_isolation.md` in memory for detailed security model

**Sessions vs Single Chat:**
- `/api/ai/action` — legacy single-message AI processing (deprecated in favor of sessions)
- `/api/sessions/:sessionId/messages` — session-based multi-turn chat with **full AI processing** (create/read/update/delete/report/clarify, not just acknowledgments)

**Clarification Flow:**
- If user input is ambiguous (confidence < 0.7), AI returns `type: 'clarify'`
- Route saves clarification state to `clarificationSessions` table
- Next user message merges with partial data to extract missing fields
- If still missing, ask again; if complete, process normally

### Flutter Mobile Architecture

```
flutter_app/lib/
├── main.dart             # App entry point
├── app.dart              # Material app config, theme
├── core/
│   ├── api/
│   │   ├── api_client.dart        # HTTP client wrapper (GET/POST/PATCH/DELETE)
│   │   └── api_interceptor.dart   # Dio interceptors (auth token injection, error handling)
│   ├── constants/
│   │   └── app_constants.dart     # API base URL, timeouts, etc.
│   └── logger/
│       ├── logger.dart            # Console logging
│       └── network_logger.dart    # HTTP request/response logging
├── features/
│   ├── calendar/          # Calendar/transaction view
│   ├── ai_chat/           # Chat session UI
│   ├── reports/           # Report detail view
│   └── ... (other features)
├── shared/
│   ├── models/
│   │   ├── chat_message.dart      # ChatMessage data model
│   │   ├── transaction.dart       # Transaction data model
│   │   └── ... (other models)
│   ├── providers/
│   │   ├── api_provider.dart      # Dio + AuthInterceptor setup
│   │   ├── auth_provider.dart     # Supabase auth + token management
│   │   └── ... (other providers)
│   └── widgets/           # Shared UI components
└── routes/
    └── app_router.dart    # GoRouter configuration
```

**State Management:**
- Uses `flutter_riverpod` for reactive state
- `authenticatedDioProvider` ensures all HTTP requests include JWT token via `AuthInterceptor`
- `AuthInterceptor` auto-retries on 401 with token refresh (Supabase session refresh)

**Key Client-Server Contract:**
- Chat messages: `POST /api/sessions/:sessionId/messages` → returns both user + AI messages in `messages[]` array
- Transaction creation: AI automatically executes based on user intent, response is formatted message
- Session management: Create/list/rename/delete sessions for organizing conversations

## Important Architectural Decisions

### 1. Session-Based AI Architecture
- **Why**: Users need persistent conversation history, not single-message interactions
- **Implementation**: `/api/sessions/:sessionId/messages` endpoint contains the **full AI processing logic** from `/ai/action` (create, read, update, delete, report, clarify)
- **Result**: Each session maintains multi-turn conversation with complete AI functionality

### 2. User Data Isolation
- **Why**: Multi-user SaaS → must prevent users from accessing others' data
- **Implementation**: 
  - JWT → userId extraction
  - Every single DB query filters by `eq(table.userId, userId)`
  - userId is never taken from request body (server-enforced)
- **Result**: Data privacy guaranteed at database layer

### 3. Drizzle ORM + SQLite (Turso)
- **Why**: Type-safe SQL, serverless scaling, no DevOps overhead
- **Key Pattern**: `db.select().from(transactions).where(and(eq(transactions.userId, userId), ...))` ensures type-safe, composable queries
- **Migrations**: SQL files in `db/migrations/` run on deployment

### 4. Ambiguous Input Handling (Clarification)
- **Why**: Korean natural language is often context-dependent; users may omit required fields
- **Implementation**: If AI confidence < 0.7, return `type: 'clarify'` with question, store state, merge next message
- **Result**: User doesn't need to re-provide data; conversation continues naturally

### 5. Configurable LLM Provider
- **Why**: Switch providers (Workers AI, Groq, Gemini, OpenAI) without code changes
- **Implementation**: `AI_PROVIDER` env var in `wrangler.jsonc` selects provider in `getLLMConfig()`
- **Config**: `backend/src/services/llm.ts` contains provider setup

## Common Development Tasks

### Adding a New API Endpoint

1. Create route handler in `backend/src/routes/new-feature.ts`:
   ```typescript
   import { Hono } from 'hono';
   import { getDb, Env } from '../db/index';
   import type { Variables } from '../middleware/auth';
   
   const router = new Hono<{ Bindings: Env; Variables: Variables }>();
   
   router.get('/', async (c) => {
     const userId = c.get('userId');  // Always use server-verified userId
     const db = getDb(c.env);
     // ... your logic with `where(eq(table.userId, userId))`
     return c.json({ data });
   });
   
   export default router;
   ```

2. Register in `backend/src/index.ts`:
   ```typescript
   app.route('/api/new-feature', newFeatureRouter);
   ```

3. Add TypeScript types in `backend/src/types/` if needed

4. Test with `npm run test` in backend/

### Running Tests

**Backend Unit Tests:**
```bash
cd backend
npm run test                 # Run all tests once
npm run test:watch         # Watch mode for development
npm run test -- src/routes/transactions.test.ts  # Single file
```

Tests use Vitest. Mock patterns:
- Database: Mock `getDb()` to return test data
- Auth: Use test middleware to set `userId` in context
- API calls: Mock fetch/HTTP responses

**Type Checking:**
```bash
cd backend
npm run type-check  # Full TypeScript check (catches all type errors)
```

### Checking Logs

**Local Development (wrangler dev):**
- Logs appear in the `npm run dev` terminal
- Check terminal output for `[wrangler:info]` lines

**Port Conflicts:**
```bash
# Check which process is using a port
lsof -i :8787   # backend default port
lsof -i :5173   # frontend default port

# Kill all Node/wrangler processes if needed
pkill -f "workerd"
pkill -f "node.*vite"
```

### Database Migrations

**Create Migration:**
```bash
cd backend
# Write SQL in db/migrations/NNN_description.sql
# Migrations auto-run on startup
```

**Schema Changes:**
1. Update `db/schema.ts` (Drizzle definitions)
2. Create `.sql` file in `db/migrations/`
3. Run `npm run dev` to test locally
4. Deploy when ready

### Switching AI Providers

Edit `backend/wrangler.jsonc`:
```json
{
  "vars": {
    "AI_PROVIDER": "groq"  // or "gemini", "openai", "workers-ai"
  }
}
```

Then in `.dev.vars`:
```
AI_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL_NAME=llama-3.1-8b-instant  // optional
```

See `backend/src/services/llm.ts` for all supported providers and required env vars.

## TypeScript Type Checking

Always run type check before committing:
```bash
cd backend && npm run type-check
cd flutter_app && flutter analyze
```

**Common Type Errors:**
- `eq(table.userId, userId)` — must match field type (text)
- `payload.items || []` — use type guards if union types
- `JSON.stringify(metadata)` — always stringify objects before storing in text fields

## Deployment

### Backend (Cloudflare Workers)
```bash
cd backend

# Set secrets (first time only)
wrangler secret put TURSO_DB_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put GROQ_API_KEY

# Deploy
npm run deploy
```

Production URL: See Cloudflare Workers dashboard after deployment

### Flutter Mobile
Build using Flutter's native tools:
```bash
flutter build apk      # Android
flutter build ios      # iOS
flutter build web      # Web (Chrome)
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `backend/src/middleware/auth.ts` | JWT validation, userId extraction, **per-user data filtering** |
| `backend/src/services/ai.ts` | Core AI action determination (parseUserInput) |
| `backend/src/routes/sessions.ts` | Session-based multi-turn chat with full AI execution |
| `backend/src/db/schema.ts` | All table definitions (users, transactions, chatMessages, sessions) |
| `flutter_app/lib/shared/providers/api_provider.dart` | Dio setup, AuthInterceptor for token injection |
| `flutter_app/lib/core/api/api_client.dart` | HTTP methods (GET, POST, PATCH, DELETE) |

## Notes for Future Work

- **Clarification UX**: Currently asks in Korean; consider multi-language support
- **Report Caching**: Reports are generated fresh; could cache by (userId, month, type)
- **Session Limits**: Consider archiving old sessions per user to avoid infinite list growth
- **Error Recovery**: Add retry logic in mobile app for failed AI requests
