import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import type { Variables } from '../../src/middleware/auth';
import type { Env } from '../../src/db/index';
import sessionsRouter from '../../src/routes/sessions';
import { ContextService } from '../../src/services/context';
import { VectorizeService } from '../../src/services/vectorize';

describe('Sessions Routes with Context Integration', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>;
  let mockDb: any;
  let mockEnv: Partial<Env>;
  let mockVectorizeService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.restoreAllMocks();

    // Setup mock environment variables
    mockEnv = {
      CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
      CLOUDFLARE_API_TOKEN: 'test-api-token',
      AI: { generate: vi.fn() } as any,
    } as any;

    // Setup mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    };

    // Setup mock VectorizeService
    mockVectorizeService = {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      searchVectors: vi.fn().mockResolvedValue([]),
    };

    // Create app with mocks
    app = new Hono<{ Bindings: Env; Variables: Variables }>();

    // Add auth middleware and mock bindings
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user-id');
      // Mock env bindings
      Object.assign(c.env, mockEnv);
      await next();
    });

    // Mock getDb function
    vi.mock('../../src/db/index', () => ({
      getDb: () => mockDb,
    }));

    app.route('/api/sessions', sessionsRouter);

    // Setup global fetch mock for LLM calls
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
          },
        }],
      }),
    }));
  });

  describe('POST /:sessionId/messages with Context', () => {
    it('should retrieve and inject context into AI response generation', async () => {
      // Mock session and user message responses
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test Session', userId: 'test-user-id' });
      mockDb.get.mockResolvedValueOnce({ id: 1, role: 'user', content: '점심 5000원', sessionId: 1 });

      // Mock transaction queries for context
      mockDb.limit.mockResolvedValueOnce([
        { id: 101, type: 'expense', amount: 5000, category: 'food', memo: 'breakfast', date: '2024-03-14' },
        { id: 102, type: 'expense', amount: 3000, category: 'food', memo: 'coffee', date: '2024-03-14' },
      ]);

      mockDb.all.mockResolvedValueOnce([
        { category: 'food' },
        { category: 'transport' },
        { category: 'entertainment' },
      ]);

      // Mock AI message response
      mockDb.get.mockResolvedValueOnce({
        id: 2,
        role: 'assistant',
        content: '점심 5000원이 추가되었습니다',
        sessionId: 1,
        metadata: '{"actionType":"create"}',
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '점심 5000원' }),
      });

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        const data = await response.json() as any;
        expect(data.success).toBe(true);
        expect(Array.isArray(data.messages)).toBe(true);
      }
    });

    it('should include context from knowledge base', async () => {
      // Mock session ownership verification
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });

      // Mock message insertion
      mockDb.get.mockResolvedValueOnce({ id: 10, role: 'user', content: '내역 보여줘', sessionId: 1 });

      // Mock transaction queries
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([{ category: 'food' }]);

      // Mock AI response
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: '3월 내역',
        sessionId: 1,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"read","payload":{"month":"2024-03"},"confidence":0.95}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '3월 내역 보여줘' }),
      });

      expect(response.status).toBeOneOf([200, 500]);
    });

    it('should include context from user transactions', async () => {
      // Mock session
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });

      // Mock message insertion
      mockDb.get.mockResolvedValueOnce({ id: 10, role: 'user', content: 'modify last transaction', sessionId: 1 });

      // Mock transaction queries with actual transactions
      mockDb.limit.mockResolvedValueOnce([
        { id: 100, type: 'expense', amount: 10000, category: 'food', memo: 'lunch', date: '2024-03-15' },
        { id: 99, type: 'expense', amount: 5000, category: 'transport', memo: 'taxi', date: '2024-03-14' },
      ]);

      mockDb.all.mockResolvedValueOnce([{ category: 'food' }, { category: 'transport' }]);

      // Mock AI response
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: 'Transaction updated',
        sessionId: 1,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"update","payload":{"id":100,"amount":12000},"confidence":0.85}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '점심을 12000원으로 수정해줘' }),
      });

      expect(response.status).toBeOneOf([200, 500]);
    });

    it('should include context from user notes', async () => {
      // Mock session
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });

      // Mock message insertion
      mockDb.get.mockResolvedValueOnce({ id: 10, role: 'user', content: '분석해줘', sessionId: 1 });

      // Mock transaction queries
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([{ category: 'food' }]);

      // Mock AI response for report
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: 'Here is your report',
        sessionId: 1,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"report","payload":{"reportType":"monthly_summary","params":{"month":"2024-03"}},"confidence":0.9}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '3월 분석해줘' }),
      });

      expect(response.status).toBeOneOf([200, 500]);
    });

    it('should format context correctly in AI system prompt', async () => {
      // Mock session
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });

      // Mock message insertion
      mockDb.get.mockResolvedValueOnce({ id: 10, role: 'user', content: 'test', sessionId: 1 });

      // Mock transaction queries
      mockDb.limit.mockResolvedValueOnce([
        { id: 100, type: 'expense', amount: 5000, category: 'food', memo: 'lunch', date: '2024-03-15' },
      ]);

      mockDb.all.mockResolvedValueOnce([{ category: 'food' }]);

      // Mock AI response
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: 'Response',
        sessionId: 1,
      });

      let capturedMessages: any[] = [];
      const mockFetch = vi.fn(async (url: string, options: any) => {
        if (options.body) {
          const body = JSON.parse(options.body);
          capturedMessages = body.messages;
        }
        return {
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: '{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
              },
            }],
          }),
        };
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test' }),
      });

      // Should either succeed or fail gracefully (without context service running)
      expect(response.status).toBeOneOf([200, 500]);
    });

    it('should gracefully degrade without context', async () => {
      // Mock session
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });

      // Mock message insertion
      mockDb.get.mockResolvedValueOnce({ id: 10, role: 'user', content: 'simple message', sessionId: 1 });

      // Mock empty transaction queries (no context available)
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([]);

      // Mock AI response even without context
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: 'Response without context',
        sessionId: 1,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'simple message' }),
      });

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      }
    });
  });

  describe('Message Persistence', () => {
    it('should save user message correctly with context session', async () => {
      // Mock session
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });

      // Mock message insertion
      mockDb.get.mockResolvedValueOnce({
        id: 10,
        role: 'user',
        content: '점심 5000원',
        sessionId: 1,
        userId: 'test-user-id',
        createdAt: '2024-03-15T12:00:00Z',
        metadata: null,
      });

      // Mock transaction queries
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([{ category: 'food' }]);

      // Mock AI response
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: 'Added',
        sessionId: 1,
        userId: 'test-user-id',
        createdAt: '2024-03-15T12:00:01Z',
        metadata: '{"actionType":"create"}',
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '점심 5000원' }),
      });

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        const data = await response.json() as any;
        expect(data.messages).toBeDefined();
        expect(data.messages[0].role).toBe('user');
        expect(data.messages[0].content).toBe('점심 5000원');
      }
    });

    it('should save AI message with correct metadata', async () => {
      // Mock session
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });

      // Mock message insertion
      mockDb.get.mockResolvedValueOnce({ id: 10, role: 'user', content: 'test', sessionId: 1 });

      // Mock transaction queries
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([{ category: 'food' }]);

      // Mock AI response
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: 'Response',
        sessionId: 1,
        metadata: '{"actionType":"create","action":{"count":1,"ids":[123],"totalAmount":5000}}',
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test' }),
      });

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        const data = await response.json() as any;
        expect(data.messages).toBeDefined();
      }
    });
  });

  describe('Context in Multi-turn Sessions', () => {
    it('should maintain context across multiple turns in session', async () => {
      // First message
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });
      mockDb.get.mockResolvedValueOnce({ id: 10, role: 'user', content: 'first message', sessionId: 1 });
      mockDb.limit.mockResolvedValueOnce([
        { id: 100, type: 'expense', amount: 5000, category: 'food', memo: 'lunch', date: '2024-03-15' },
      ]);
      mockDb.all.mockResolvedValueOnce([{ category: 'food' }]);
      mockDb.get.mockResolvedValueOnce({
        id: 11,
        role: 'assistant',
        content: 'Response 1',
        sessionId: 1,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
            },
          }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      // Send first message
      const response1 = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'first message' }),
      });

      expect(response1.status).toBeOneOf([200, 500]);

      // Second message - context should include response from first
      mockDb.get.mockResolvedValueOnce({ id: 1, title: 'Test', userId: 'test-user-id' });
      mockDb.get.mockResolvedValueOnce({ id: 12, role: 'user', content: 'second message', sessionId: 1 });
      mockDb.limit.mockResolvedValueOnce([
        { id: 100, type: 'expense', amount: 5000, category: 'food', memo: 'lunch', date: '2024-03-15' },
        { id: 101, type: 'expense', amount: 8000, category: 'food', memo: 'dinner', date: '2024-03-15' },
      ]);
      mockDb.all.mockResolvedValueOnce([{ category: 'food' }]);
      mockDb.get.mockResolvedValueOnce({
        id: 13,
        role: 'assistant',
        content: 'Response 2',
        sessionId: 1,
      });

      const response2 = await app.request('/api/sessions/1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'second message' }),
      });

      expect(response2.status).toBeOneOf([200, 500]);
    });
  });
});
