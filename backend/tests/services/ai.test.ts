import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIService } from '../../src/services/ai';

describe('AIService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses valid JSON response from Groq API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"type":"read","payload":{"month":"2024-03"},"confidence":0.95}',
          },
        }],
      }),
    }));

    const service = new AIService({ provider: 'workers-ai', apiKey: 'test-api-key', modelName: '@cf/meta/llama-2-7b-chat-int8' });
    const result = await service.parseUserInput('3월 내역 보여줘', [], []);

    expect(result.type).toBe('read');
    expect(result.payload).toEqual({ month: '2024-03' });
  });

  it('sends request to Groq API endpoint with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"type":"create","payload":{"transactionType":"expense","amount":12000,"category":"food","date":"2024-03-15"},"confidence":0.9}',
          },
        }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const service = new AIService({ provider: 'workers-ai', apiKey: 'my-api-key', modelName: '@cf/meta/llama-2-7b-chat-int8' });
    await service.parseUserInput('점심 12000원 썼어', [], []);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer my-api-key',
        }),
      })
    );
  });

  it('uses custom model name when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"type":"read","payload":{},"confidence":0.8}',
          },
        }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const service = new AIService({ provider: 'workers-ai', apiKey: 'test-api-key', modelName: '@cf/meta/llama-2-7b-chat-int8' });
    await service.parseUserInput('내역 보여줘', [], []);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('mixtral-8x7b-32768');
  });

  it('uses default model when model name not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"type":"read","payload":{},"confidence":0.8}',
          },
        }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const service = new AIService({ provider: 'workers-ai', apiKey: 'test-api-key', modelName: '@cf/meta/llama-2-7b-chat-int8' });
    await service.parseUserInput('내역 보여줘', [], []);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('llama-3.3-70b-versatile');
  });

  it('throws error when API response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } }),
    }));

    const service = new AIService({ provider: 'workers-ai', apiKey: 'bad-api-key', modelName: '@cf/meta/llama-2-7b-chat-int8' });
    await expect(service.parseUserInput('테스트', [], [])).rejects.toThrow();
  });

  it('throws error when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const service = new AIService({ provider: 'workers-ai', apiKey: 'test-api-key', modelName: '@cf/meta/llama-2-7b-chat-int8' });
    await expect(service.parseUserInput('테스트', [], [])).rejects.toThrow('Failed to process request');
  });
});
