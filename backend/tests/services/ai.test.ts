import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIService } from '../../src/services/ai';
import { ContextService } from '../../src/services/context';
import * as llm from '../../src/services/llm';

describe('AIService', () => {
  let mockDb: any;
  let mockContextService: any;
  let callLLMSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    // Setup mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      all: vi.fn().mockResolvedValue([]),
    };

    // Setup mock context service
    mockContextService = {
      getContextForParse: vi.fn().mockResolvedValue({
        knowledge: [],
        transactions: [],
        notes: [],
        formatted: '',
      }),
      getContextForAction: vi.fn().mockResolvedValue({
        knowledge: [],
        transactions: [],
        notes: [],
        formatted: '',
      }),
    };

    callLLMSpy = vi.spyOn(llm, 'callLLM');
  });

  it('parses valid JSON response with required parameters', async () => {
    callLLMSpy.mockResolvedValue('{"type":"read","payload":{"month":"2024-03"},"confidence":0.95}');

    const service = new AIService({ provider: 'gemini', apiKey: 'test-api-key', modelName: 'gemini-pro' });
    const result = await service.parseUserInput('3월 내역 보여줘', [], [], 'user-123', mockContextService, mockDb);

    expect(result.type).toBe('read');
    expect(result.payload).toEqual({ month: '2024-03' });
  });

  it('requires userId parameter', async () => {
    callLLMSpy.mockResolvedValue('{"type":"create","payload":{"transactionType":"expense","amount":12000,"category":"food","date":"2024-03-15"},"confidence":0.9}');

    const service = new AIService({ provider: 'gemini', apiKey: 'my-api-key', modelName: 'gemini-pro' });
    const result = await service.parseUserInput('점심 12000원 썼어', [], [], 'user-456', mockContextService, mockDb);

    expect(result.type).toBe('create');
    expect(mockContextService.getContextForParse).toHaveBeenCalledWith(
      mockDb,
      'user-456',
      '점심 12000원 썼어'
    );
  });

  it('requires contextService parameter', async () => {
    callLLMSpy.mockResolvedValue('{"type":"read","payload":{},"confidence":0.8}');

    const service = new AIService({ provider: 'gemini', apiKey: 'test-api-key', modelName: 'gemini-pro' });
    const result = await service.parseUserInput('내역 보여줘', [], [], 'user-123', mockContextService, mockDb);

    expect(mockContextService.getContextForParse).toHaveBeenCalled();
  });

  it('requires db parameter', async () => {
    callLLMSpy.mockResolvedValue('{"type":"read","payload":{},"confidence":0.8}');

    const service = new AIService({ provider: 'gemini', apiKey: 'test-api-key', modelName: 'gemini-pro' });
    const result = await service.parseUserInput('내역 보여줘', [], [], 'user-123', mockContextService, mockDb);

    expect(mockContextService.getContextForParse).toHaveBeenCalledWith(
      mockDb,
      expect.any(String),
      expect.any(String)
    );
  });

  it('throws error when API response fails', async () => {
    callLLMSpy.mockRejectedValue(new Error('API error'));

    const service = new AIService({ provider: 'gemini', apiKey: 'bad-api-key', modelName: 'gemini-pro' });
    await expect(service.parseUserInput('테스트', [], [], 'user-123', mockContextService, mockDb)).rejects.toThrow('Failed to process request');
  });

  it('throws error when fetch fails', async () => {
    callLLMSpy.mockRejectedValue(new Error('network error'));

    const service = new AIService({ provider: 'gemini', apiKey: 'test-api-key', modelName: 'gemini-pro' });
    await expect(service.parseUserInput('테스트', [], [], 'user-123', mockContextService, mockDb)).rejects.toThrow('Failed to process request');
  });
});
