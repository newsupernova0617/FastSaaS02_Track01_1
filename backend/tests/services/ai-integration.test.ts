import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIService } from '../../src/services/ai';
import { ContextService } from '../../src/services/context';
import * as llm from '../../src/services/llm';
import type { Transaction } from '../../src/db/schema';

describe('AIService Integration with ContextService', () => {
  let mockDb: any;
  let mockVectorizeService: any;
  let contextService: ContextService;
  let aiService: AIService;
  let callLLMSpy: any;

  beforeEach(() => {
    // Reset all mocks
    vi.restoreAllMocks();

    // Setup mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      all: vi.fn().mockResolvedValue([]),
    };

    // Setup mock VectorizeService
    mockVectorizeService = {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      searchVectors: vi.fn().mockResolvedValue([]),
    };

    // Initialize services
    contextService = new ContextService(mockVectorizeService);
    const config = { provider: 'gemini' as const, apiKey: 'test-key', modelName: 'gemini-pro' };
    aiService = new AIService(config);

    // Mock callLLM to avoid actual API calls
    callLLMSpy = vi.spyOn(llm, 'callLLM');
  });

  describe('Context Injection in Messages', () => {
    it('should include context in LLM messages when context is available', async () => {
      // Mock context retrieval
      vi.spyOn(contextService, 'getContextForParse').mockResolvedValue({
        knowledge: [],
        transactions: [],
        notes: [],
        formatted: 'Consider this context:\n\n## Recent Transactions:\n- lunch - ₩5000 (expense)',
      });

      callLLMSpy.mockResolvedValue('{"type":"create","payload":{"transactionType":"expense","amount":12000,"category":"food","memo":"dinner","date":"2024-03-15"},"confidence":0.9}');

      const result = await aiService.parseUserInput(
        '저녁 12000원 썼어',
        [],
        ['food', 'transport'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('create');
      expect(callLLMSpy).toHaveBeenCalled();

      // Verify that context was retrieved
      expect(contextService.getContextForParse).toHaveBeenCalledWith(
        mockDb,
        'user-123',
        '저녁 12000원 썼어'
      );
    });

    it('should format context as system message before user message', async () => {
      const contextFormatted = 'Consider this context:\n\n## Recent Transactions:\n- lunch';

      vi.spyOn(contextService, 'getContextForParse').mockResolvedValue({
        knowledge: [],
        transactions: [],
        notes: [],
        formatted: contextFormatted,
      });

      let capturedMessages: any[] = [];
      callLLMSpy.mockImplementation((messages: any[]) => {
        capturedMessages = messages;
        return Promise.resolve('{"type":"read","payload":{"month":"2024-03"},"confidence":0.9}');
      });

      await aiService.parseUserInput(
        '3월 내역 보여줘',
        [],
        ['food'],
        'user-123',
        contextService,
        mockDb
      );

      // Verify message order: system prompt -> context system message -> user message
      expect(capturedMessages.length).toBeGreaterThan(2);
      expect(capturedMessages[0].role).toBe('system');
      expect(capturedMessages[0].content).toContain('budget transaction assistant');

      // Find context message and user message
      const contextMsg = capturedMessages.find((m: any) => m.content.includes('Consider this context'));
      const userMsg = capturedMessages.find((m: any) => m.role === 'user');

      expect(contextMsg).toBeDefined();
      expect(contextMsg?.role).toBe('system');
      expect(userMsg).toBeDefined();

      // Verify context appears before user message
      const contextIndex = capturedMessages.indexOf(contextMsg);
      const userIndex = capturedMessages.indexOf(userMsg);
      expect(contextIndex).toBeLessThan(userIndex);
    });

    it('should include context for CREATE action with minimal context items', async () => {
      vi.spyOn(contextService, 'getContextForParse').mockResolvedValue({
        knowledge: [{ type: 'knowledge', content: 'Budget tip', source: 'general', metadata: {} }],
        transactions: [{ type: 'transaction', content: 'lunch - ₩5000', source: '2024-03-14', metadata: {} }],
        notes: [{ type: 'note', content: 'Daily budget', source: 'note-1', metadata: {} }],
        formatted: 'Consider this context:\n\n## Financial Knowledge:\n- Budget tip\n\n## Recent Transactions:\n- lunch - ₩5000',
      });

      callLLMSpy.mockResolvedValue('{"type":"create","payload":{"transactionType":"expense","amount":8000,"category":"food","date":"2024-03-15"},"confidence":0.95}');

      const result = await aiService.parseUserInput(
        '아침 8000원',
        [],
        ['food'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('create');
      expect(contextService.getContextForParse).toHaveBeenCalledWith(
        mockDb,
        'user-123',
        '아침 8000원'
      );
    });

    it('should include rich context for READ action', async () => {
      vi.spyOn(contextService, 'getContextForParse').mockResolvedValue({
        knowledge: [
          { type: 'knowledge', content: 'Monthly analysis', source: 'general', metadata: {} },
          { type: 'knowledge', content: 'Spending trends', source: 'general', metadata: {} },
        ],
        transactions: [
          { type: 'transaction', content: 'lunch - ₩5000', source: '2024-03-14', metadata: {} },
          { type: 'transaction', content: 'transport - ₩2500', source: '2024-03-13', metadata: {} },
        ],
        notes: [{ type: 'note', content: 'Reduce food expenses', source: 'note-1', metadata: {} }],
        formatted: 'Consider this context:\n\n## Financial Knowledge:\n- Monthly analysis\n- Spending trends',
      });

      callLLMSpy.mockResolvedValue('{"type":"read","payload":{"month":"2024-03","category":"food"},"confidence":0.95}');

      const result = await aiService.parseUserInput(
        '지난달 식비 내역',
        [],
        ['food', 'transport'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('read');
      expect(contextService.getContextForParse).toHaveBeenCalledWith(
        mockDb,
        'user-123',
        '지난달 식비 내역'
      );
    });

    it('should include rich context for REPORT action', async () => {
      vi.spyOn(contextService, 'getContextForParse').mockResolvedValue({
        knowledge: [
          { type: 'knowledge', content: 'Budget allocation', source: 'general', metadata: {} },
          { type: 'knowledge', content: 'Expense categories', source: 'general', metadata: {} },
          { type: 'knowledge', content: 'Savings goals', source: 'general', metadata: {} },
        ],
        transactions: [
          { type: 'transaction', content: 'lunch - ₩5000', source: '2024-03-14', metadata: {} },
          { type: 'transaction', content: 'movie - ₩12000', source: '2024-03-14', metadata: {} },
        ],
        notes: [
          { type: 'note', content: 'Save 20% monthly', source: 'note-1', metadata: {} },
          { type: 'note', content: 'Track entertainment', source: 'note-2', metadata: {} },
        ],
        formatted: 'Consider this context:\n\n## Financial Knowledge:\n- Budget allocation\n- Expense categories',
      });

      callLLMSpy.mockResolvedValue('{"type":"report","payload":{"reportType":"monthly_summary","params":{"month":"2024-03"}},"confidence":0.95}');

      const result = await aiService.parseUserInput(
        '3월 분석해줘',
        [],
        ['food', 'entertainment'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('report');
      expect(contextService.getContextForParse).toHaveBeenCalledWith(
        mockDb,
        'user-123',
        '3월 분석해줘'
      );
    });

    it('should include moderate context for CLARIFY action', async () => {
      vi.spyOn(contextService, 'getContextForParse').mockResolvedValue({
        knowledge: [{ type: 'knowledge', content: 'Budget info', source: 'general', metadata: {} }],
        transactions: [
          { type: 'transaction', content: 'lunch - ₩5000', source: '2024-03-14', metadata: {} },
          { type: 'transaction', content: 'coffee - ₩3000', source: '2024-03-14', metadata: {} },
        ],
        notes: [],
        formatted: 'Consider this context:\n\n## Recent Transactions:\n- lunch - ₩5000\n- coffee - ₩3000',
      });

      callLLMSpy.mockResolvedValue('{"type":"clarify","payload":{"message":"얼마를 썼나요?","missingFields":["amount"],"partialData":{"transactionType":"expense","category":"food"}},"confidence":0.6}');

      const result = await aiService.parseUserInput(
        '점심 (액수 없음)',
        [],
        ['food'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('clarify');
      expect(contextService.getContextForParse).toHaveBeenCalledWith(
        mockDb,
        'user-123',
        '점심 (액수 없음)'
      );
    });

    it('should gracefully handle context service failure and continue without context', async () => {
      vi.spyOn(contextService, 'getContextForParse').mockRejectedValue(
        new Error('Context service error')
      );

      callLLMSpy.mockResolvedValue('{"type":"create","payload":{"transactionType":"expense","amount":5000,"category":"food","date":"2024-03-15"},"confidence":0.9}');

      // Should not throw even if context service fails
      const result = await aiService.parseUserInput(
        '점심 5000원',
        [],
        ['food'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('create');
      expect(callLLMSpy).toHaveBeenCalled();
    });

    it('should not include context for plain_text action', async () => {
      const getContextSpy = vi.spyOn(contextService, 'getContextForParse').mockResolvedValue({
        knowledge: [],
        transactions: [],
        notes: [],
        formatted: '',
      });

      callLLMSpy.mockResolvedValue('{"type":"plain_text","payload":{},"confidence":0.95}');

      const result = await aiService.parseUserInput(
        '안녕하세요',
        [],
        ['food'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('plain_text');
      // Context is still retrieved but not used for plain_text
      expect(getContextSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing if context retrieval fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(contextService, 'getContextForParse').mockRejectedValue(
        new Error('Database connection failed')
      );

      callLLMSpy.mockResolvedValue('{"type":"read","payload":{"month":"2024-03"},"confidence":0.9}');

      const result = await aiService.parseUserInput(
        '내역 보여줘',
        [],
        ['food'],
        'user-123',
        contextService,
        mockDb
      );

      expect(result.type).toBe('read');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch context:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
