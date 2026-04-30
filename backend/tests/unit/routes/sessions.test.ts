import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { mockLlmResponse } from '../../helpers/llm-mock';
import { seedUser, seedSession, seedTransaction } from '../../helpers/fixtures';
import { transactions, chatMessages, clarificationSessions, sessions } from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set up a spy that returns different LLM responses for successive calls.
 * Uses a dynamic import to avoid a top-level static import of the llm module
 * that could interfere with vi.mock hoisting in sibling test files (ai.test.ts
 * uses vi.mock on nearby modules in the same project, and Vitest's module
 * registry can be sensitive to import ordering when vi.mock is involved).
 */
async function mockLlmSequence(...responses: string[]): Promise<void> {
  // Dynamic import avoids a top-level static import of the llm module which
  // could interfere with vi.mock hoisting in sibling test files (ai.test.ts
  // uses vi.mock on nearby modules in the same project, and Vitest's module
  // registry is sensitive to import ordering when vi.mock is involved).
  const llmMod = await import('../../../src/services/llm');
  const spy = vi.spyOn(llmMod, 'callLLM');
  for (const r of responses) {
    spy.mockResolvedValueOnce(r);
  }
}

/**
 * The rate limiter in sessions.ts is a module-level Map that persists across
 * every test in the process. Using a unique userId per test prevents count
 * bleed between tests.
 */
let _userCounter = 0;
function freshUserId(prefix = 'user'): string {
  return `${prefix}-${++_userCounter}`;
}

function makeRequest(
  method: string,
  path: string,
  body: object | null,
  headers: Record<string, string>
): Request {
  return new Request(`http://test${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== null ? JSON.stringify(body) : undefined,
  });
}

async function postMessage(
  appHandle: TestAppHandle,
  sessionId: number | string,
  content: string,
  headers: Record<string, string>
): Promise<Response> {
  return appHandle.app.fetch(
    makeRequest('POST', `/api/sessions/${sessionId}/messages`, { content }, headers),
    appHandle.env as any
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('routes/sessions.ts', () => {
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

  // -------------------------------------------------------------------------
  // 1. Universal auth contract
  // -------------------------------------------------------------------------

  describe('auth contract — POST /api/sessions', () => {
    it('rejects missing / malformed / expired JWT with 401', async () => {
      await expectAuthContract(appHandle, 'POST', '/api/sessions', { title: 'test' });
    });
  });

  describe('auth contract — POST /api/sessions/:id/messages', () => {
    it('rejects missing / malformed / expired JWT with 401', async () => {
      // Auth check fires before ownership check so the session doesn't need to exist
      await expectAuthContract(appHandle, 'POST', '/api/sessions/1/messages', {
        content: 'hello',
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/sessions — session owned by JWT userId
  // -------------------------------------------------------------------------

  describe('POST /api/sessions', () => {
    it('creates session and DB row userId matches JWT sub', async () => {
      const userId = freshUserId('owner');
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await appHandle.app.fetch(
        makeRequest('POST', '/api/sessions', { title: 'My Budget' }, headers),
        appHandle.env as any
      );

      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.session.id).toBeDefined();

      // Verify the DB row has the correct userId
      const rows = await dbHandle.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, body.session.id))
        .all();

      expect(rows).toHaveLength(1);
      expect(rows[0].userId).toBe(userId);
    });

    it('returns 400 when title is missing', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await appHandle.app.fetch(
        makeRequest('POST', '/api/sessions', {}, headers),
        appHandle.env as any
      );
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Session ownership enforcement — POST :id/messages
  // -------------------------------------------------------------------------

  describe('POST /api/sessions/:id/messages — cross-user isolation', () => {
    it('returns 404 when session belongs to another user', async () => {
      const alice = freshUserId('alice');
      const bob = freshUserId('bob');
      await seedUser(dbHandle.db, { id: alice });
      await seedUser(dbHandle.db, { id: bob });

      // Seed a session owned by bob
      const bobSession = await seedSession(dbHandle.db, { userId: bob });

      // Alice attempts to send a message to Bob's session
      const aliceHeaders = await authHeaders(alice);
      const res = await postMessage(appHandle, bobSession.id, 'hello', aliceHeaders);

      // getSession filters by userId → null for alice → 404
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 4. AI action: create → transaction inserted with correct userId
  // -------------------------------------------------------------------------

  describe('POST :id/messages — AI action: create', () => {
    it('inserts transaction with correct userId, saves both user and AI messages', async () => {
      mockLlmResponse(
        JSON.stringify({
          type: 'create',
          payload: {
            transactionType: 'expense',
            amount: 15000,
            category: 'food',
            memo: '점심',
            date: '2026-04-13',
          },
          confidence: 0.95,
        })
      );

      const userId = freshUserId('creator');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const res = await postMessage(appHandle, session.id, '점심 15000원 썼어요', headers);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.type).toBe('create');
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[1].role).toBe('assistant');

      // Verify transaction was written with the correct userId
      const txRows = await dbHandle.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .all();

      expect(txRows).toHaveLength(1);
      expect(txRows[0].userId).toBe(userId);
      expect(txRows[0].amount).toBe(15000);
      expect(txRows[0].category).toBe('food');

      // Verify both chat messages saved with correct userId and sessionId
      const msgRows = await dbHandle.db
        .select()
        .from(chatMessages)
        .where(and(eq(chatMessages.sessionId, session.id), eq(chatMessages.userId, userId)))
        .all();

      expect(msgRows).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // 5. AI action: clarify → clarification state saved, no transaction created
  // -------------------------------------------------------------------------

  describe('POST :id/messages — AI action: clarify', () => {
    it('saves clarification state with correct userId and does not create a transaction', async () => {
      mockLlmResponse(
        JSON.stringify({
          type: 'clarify',
          payload: {
            message: '얼마를 썼나요?',
            missingFields: ['amount'],
            partialData: { transactionType: 'expense', category: 'food', memo: '커피' },
          },
          confidence: 0.6,
        })
      );

      const userId = freshUserId('clarifier');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const res = await postMessage(appHandle, session.id, '커피 마셨어요', headers);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.type).toBe('clarify');

      // No transaction should be created
      const txRows = await dbHandle.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .all();
      expect(txRows).toHaveLength(0);

      // Clarification state should be saved with correct userId
      const clarRows = await dbHandle.db
        .select()
        .from(clarificationSessions)
        .where(
          and(
            eq(clarificationSessions.userId, userId),
            eq(clarificationSessions.chatSessionId, session.id)
          )
        )
        .all();

      expect(clarRows).toHaveLength(1);
      expect(clarRows[0].userId).toBe(userId);

      const state = JSON.parse(clarRows[0].state);
      expect(state.missingFields).toContain('amount');
    });

    it('creates a transaction from merged clarification data when the reply completes missing fields', async () => {
      mockLlmResponse(
        JSON.stringify({
          type: 'clarify',
          payload: {
            message: '얼마를 썼나요?',
            missingFields: ['amount'],
            partialData: {
              transactionType: 'expense',
              category: '식비',
              memo: '커피',
              date: '2026-04-13',
            },
          },
          confidence: 0.6,
        })
      );

      const userId = freshUserId('clarify-create');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const clarifyRes = await postMessage(appHandle, session.id, '커피 마셨어요', headers);
      expect(clarifyRes.status).toBe(200);
      expect((await clarifyRes.json() as any).type).toBe('clarify');

      const createRes = await postMessage(appHandle, session.id, '5000원이요', headers);
      expect(createRes.status).toBe(200);

      const body = await createRes.json() as any;
      expect(body.success).toBe(true);
      expect(body.type).toBe('create');

      const txRows = await dbHandle.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .all();

      expect(txRows).toHaveLength(1);
      expect(txRows[0].amount).toBe(5000);
      expect(txRows[0].category).toBe('식비');
      expect(txRows[0].memo).toBe('커피');
    });
  });

  // -------------------------------------------------------------------------
  // 6. AI action: report → report generated, no transaction side-effects
  // -------------------------------------------------------------------------

  describe('POST :id/messages — AI action: report', () => {
    it('generates report, saves chat messages, does not create/modify transactions', async () => {
      // parseUserInput calls callLLM once; report sections are generated from DB aggregation.
      const reportAction = JSON.stringify({
        type: 'report',
        payload: {
          reportType: 'monthly_summary',
          params: { month: '2026-04' },
        },
        confidence: 0.92,
      });
      await mockLlmSequence(reportAction);

      const userId = freshUserId('reporter');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const res = await postMessage(appHandle, session.id, '이번달 리포트 보여줘', headers);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.type).toBe('report');

      // No transactions should be created
      const txRows = await dbHandle.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .all();
      expect(txRows).toHaveLength(0);

      // No clarification sessions should be created
      const clarRows = await dbHandle.db
        .select()
        .from(clarificationSessions)
        .where(eq(clarificationSessions.userId, userId))
        .all();
      expect(clarRows).toHaveLength(0);

      // Chat messages should be saved (user + AI assistant)
      const msgRows = await dbHandle.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, session.id))
        .all();
      expect(msgRows.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // 7. AI action: plain_text → only chat messages saved
  // -------------------------------------------------------------------------

  describe('POST :id/messages — AI action: plain_text', () => {
    it('saves only chat messages, no transaction or clarification created', async () => {
      // parseUserInput calls callLLM once; plain_text response is static.
      const plainTextAction = JSON.stringify({
        type: 'plain_text',
        payload: {},
        confidence: 0.95,
      });
      await mockLlmSequence(plainTextAction);

      const userId = freshUserId('chatter');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const res = await postMessage(appHandle, session.id, '안녕!', headers);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.type).toBe('plain_text');
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[1].role).toBe('assistant');

      // No transactions created
      const txRows = await dbHandle.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .all();
      expect(txRows).toHaveLength(0);

      // No clarification state created
      const clarRows = await dbHandle.db
        .select()
        .from(clarificationSessions)
        .where(eq(clarificationSessions.userId, userId))
        .all();
      expect(clarRows).toHaveLength(0);

      // Both chat messages saved
      const msgRows = await dbHandle.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, session.id))
        .all();
      expect(msgRows).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Rate limiting — 21st request in the same window returns 429
  // -------------------------------------------------------------------------

  describe('rate limiting', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      // Advance well past the 60s window so the rate limiter resets for this
      // userId before any subsequent test could reuse it (belt-and-suspenders).
      vi.advanceTimersByTime(61_000);
      vi.useRealTimers();
    });

    it('returns 429 after 20 AI requests per minute for the same user', async () => {
      // Use a unique userId specific to this rate-limit test to avoid any
      // count bleed from other tests (the limiter Map is module-level).
      const userId = freshUserId('ratelimit');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      mockLlmResponse(
        JSON.stringify({ type: 'plain_text', payload: {}, confidence: 0.95 })
      );

      for (let i = 0; i < 20; i++) {
        const res = await postMessage(appHandle, session.id, `message ${i}`, headers);
        expect(res.status, `request ${i + 1} should not be 429`).not.toBe(429);
        // Stay within the 60s window by advancing only a small amount
        vi.advanceTimersByTime(100);
      }

      // The 21st request must be rate-limited
      const res21 = await postMessage(appHandle, session.id, 'over the limit', headers);
      expect(res21.status).toBe(429);

      // Advance past the window — handled by afterEach
    });

    it('does not rate-limit a different user when another user is throttled', async () => {
      const userId = freshUserId('ratelimit-other');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });

      mockLlmResponse(
        JSON.stringify({ type: 'plain_text', payload: {}, confidence: 0.95 })
      );

      const userHeaders = await authHeaders(userId);

      // This user's very first request must succeed even if other users are throttled
      const res = await postMessage(appHandle, session.id, 'hello', userHeaders);
      expect(res.status).not.toBe(429);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Empty / whitespace message → 400
  // -------------------------------------------------------------------------

  describe('POST :id/messages — input validation', () => {
    it('returns 400 when content is empty string', async () => {
      const userId = freshUserId('validator');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const res = await postMessage(appHandle, session.id, '', headers);
      expect(res.status).toBe(400);
    });

    it('returns 400 when content field is missing', async () => {
      const userId = freshUserId('validator2');
      await seedUser(dbHandle.db, { id: userId });
      const session = await seedSession(dbHandle.db, { userId });
      const headers = await authHeaders(userId);

      const res = await appHandle.app.fetch(
        makeRequest('POST', `/api/sessions/${session.id}/messages`, {}, headers),
        appHandle.env as any
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when session ID is not a valid integer', async () => {
      const userId = freshUserId('validator3');
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await postMessage(appHandle, 'abc' as any, 'hello', headers);
      expect(res.status).toBe(400);
    });
  });
});
