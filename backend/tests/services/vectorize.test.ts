import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorizeService } from '../../src/services/vectorize';

describe('VectorizeService', () => {
  let service: VectorizeService;
  let fetchSpy: any;

  beforeEach(() => {
    service = new VectorizeService('test-account-id', 'test-api-token');
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('embedText', () => {
    it('should return embedding vector from Cloudflare API', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.embedText('test text');

      expect(result).toEqual(mockEmbedding);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('@cf/baai/bge-base-en-v1.5'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should construct correct API URL with account ID', async () => {
      const mockEmbedding = [0.1, 0.2];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      await service.embedText('test');

      const callUrl = fetchSpy.mock.calls[0][0];
      expect(callUrl).toContain('https://api.cloudflare.com/client/v4/accounts');
      expect(callUrl).toContain('test-account-id');
      expect(callUrl).toContain('ai/run');
    });

    it('should send text in request body', async () => {
      const mockEmbedding = [0.1, 0.2];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const testText = 'hello world';
      await service.embedText(testText);

      const callOptions = fetchSpy.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);
      expect(body.text).toBe(testText);
    });

    it('should return empty array on API error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should return empty array on 401 Unauthorized', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should return empty array on 403 Forbidden', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should return empty array on 429 Rate Limited', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should return empty array on fetch exception', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should return empty array on connection timeout', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should handle missing embedding in response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No embedding field
      });

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should handle null embedding in response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: null }),
      });

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should handle malformed JSON response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('JSON parse error');
        },
      });

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
    });

    it('should handle empty text input', async () => {
      const mockEmbedding = [0.0, 0.0];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.embedText('');

      expect(Array.isArray(result)).toBe(true);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('should handle long text input', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const longText = 'a'.repeat(10000);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.embedText(longText);

      expect(result).toEqual(mockEmbedding);
      const callOptions = fetchSpy.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);
      expect(body.text.length).toBe(10000);
    });

    it('should handle special characters in text', async () => {
      const mockEmbedding = [0.1, 0.2];
      const specialText = '한글 テスト émojis 🎉 !@#$%^&*()';
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.embedText(specialText);

      expect(result).toEqual(mockEmbedding);
      const callOptions = fetchSpy.mock.calls[0][1];
      const body = JSON.parse(callOptions.body);
      expect(body.text).toBe(specialText);
    });

    it('should return embedding vectors with correct dimensions', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.embedText('test');

      expect(result.length).toBe(8);
      expect(result.every(val => typeof val === 'number')).toBe(true);
    });

    it('should handle floating point precision', async () => {
      const mockEmbedding = [0.123456789, 0.987654321, 0.111111111];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.embedText('test');

      expect(result[0]).toBeCloseTo(0.123456789, 8);
      expect(result[1]).toBeCloseTo(0.987654321, 8);
      expect(result[2]).toBeCloseTo(0.111111111, 8);
    });

    it('should retry with exponential backoff on failure', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];

      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            embedding: mockEmbedding,
            model: 'bge-base-en-v1.5',
            usage: { input_tokens: 10 },
          }),
        });

      const startTime = Date.now();
      const result = await service.embedText('test text');
      const elapsed = Date.now() - startTime;

      expect(result).toEqual(mockEmbedding);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(elapsed).toBeGreaterThanOrEqual(350);
    });

    it('should return empty array after all retries fail', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockRejectedValueOnce(new Error('Network error 3'));

      const result = await service.embedText('test text');

      expect(result).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should succeed on second retry attempt', async () => {
      const mockEmbedding = [0.5, 0.6, 0.7];

      fetchSpy
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            embedding: mockEmbedding,
            model: 'bge-base-en-v1.5',
            usage: { input_tokens: 10 },
          }),
        });

      const result = await service.embedText('test text');

      expect(result).toEqual(mockEmbedding);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchVectors', () => {
    it('should search vectors and return results with scores', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 0.95,
            values: embedding,
            metadata: { content: 'Result 1', userId: 'user-123' },
          },
          {
            id: '2',
            score: 0.87,
            values: embedding,
            metadata: { content: 'Result 2', userId: 'user-123' },
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(embedding, 'user_notes', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        content: 'Result 1',
        score: 0.95,
      });
      expect(result[1]).toEqual({
        id: '2',
        content: 'Result 2',
        score: 0.87,
      });
    });

    it('should filter results by userId when provided', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 0.95,
            values: embedding,
            metadata: { content: 'Result 1', userId: 'user-123' },
          },
          {
            id: '2',
            score: 0.87,
            values: embedding,
            metadata: { content: 'Result 2', userId: 'user-456' },
          },
          {
            id: '3',
            score: 0.76,
            values: embedding,
            metadata: { content: 'Result 3', userId: 'user-123' },
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(embedding, 'user_notes', 10, 'user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should respect the limit parameter', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 0.95,
            values: embedding,
            metadata: { content: 'Result 1', userId: 'user-123' },
          },
          {
            id: '2',
            score: 0.87,
            values: embedding,
            metadata: { content: 'Result 2', userId: 'user-123' },
          },
          {
            id: '3',
            score: 0.76,
            values: embedding,
            metadata: { content: 'Result 3', userId: 'user-123' },
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(embedding, 'user_notes', 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should return empty array on API error', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await service.searchVectors(embedding, 'user_notes', 10);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty embedding', async () => {
      const result = await service.searchVectors([], 'user_notes', 10);

      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should retry on network failure with exponential backoff', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 0.95,
            values: embedding,
            metadata: { content: 'Result 1', userId: 'user-123' },
          },
        ],
      };

      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults,
        });

      const startTime = Date.now();
      const result = await service.searchVectors(embedding, 'user_notes', 10);
      const elapsed = Date.now() - startTime;

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(elapsed).toBeGreaterThanOrEqual(350);
    });

    it('should normalize scores to 0-1 range', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 1.5,
            values: embedding,
            metadata: { content: 'Result 1', userId: 'user-123' },
          },
          {
            id: '2',
            score: -0.2,
            values: embedding,
            metadata: { content: 'Result 2', userId: 'user-123' },
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(embedding, 'user_notes', 10);

      expect(result[0].score).toBe(1);
      expect(result[1].score).toBe(0);
    });

    it('should handle missing metadata gracefully', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 0.95,
            values: embedding,
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(embedding, 'user_notes', 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        content: '',
        score: 0.95,
      });
    });

    it('should return empty array when API returns no matches', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(embedding, 'user_notes', 10);

      expect(result).toEqual([]);
    });

    it('should handle malformed API response gracefully', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await service.searchVectors(embedding, 'user_notes', 10);

      expect(result).toEqual([]);
    });

    it('should return empty array after all retries fail', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      fetchSpy
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      const result = await service.searchVectors(embedding, 'user_notes', 10);

      expect(result).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle high-dimensional vectors', async () => {
      const highDimVector = Array.from({ length: 768 }, (_, i) => i / 768);
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 0.95,
            values: highDimVector,
            metadata: { content: 'Result 1', userId: 'user-123' },
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(highDimVector, 'test_table', 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should handle empty userId string (no filtering)', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = {
        matches: [
          {
            id: '1',
            score: 0.95,
            values: embedding,
            metadata: { content: 'Result 1', userId: 'user-123' },
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await service.searchVectors(embedding, 'test_table', 10, '');

      expect(result).toHaveLength(1);
    });
  });

  describe('Constructor', () => {
    it('should initialize service with correct account ID and token', () => {
      const accountId = 'my-account-123';
      const token = 'my-secret-token';
      const svc = new VectorizeService(accountId, token);

      expect(svc).toBeDefined();
      expect(svc).toBeInstanceOf(VectorizeService);
    });

    it('should construct correct base URL', async () => {
      const accountId = 'custom-account-id';
      const svc = new VectorizeService(accountId, 'test-token');

      const mockEmbedding = [0.1, 0.2];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      await svc.embedText('test');

      const callUrl = fetchSpy.mock.calls[0][0];
      expect(callUrl).toContain('custom-account-id');
    });

    it('should handle empty account ID', () => {
      const svc = new VectorizeService('', 'test-token');

      expect(svc).toBeDefined();
    });

    it('should handle empty token', async () => {
      const svc = new VectorizeService('test-account', '');

      const mockEmbedding = [0.1, 0.2];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      await svc.embedText('test');

      const callOptions = fetchSpy.mock.calls[0][1];
      expect(callOptions.headers.Authorization).toBe('Bearer ');
    });
  });

  describe('Error Handling Integration', () => {
    it('should continue operation after error and recovery', async () => {
      // First embedText call: 3 retries, all fail
      fetchSpy
        .mockRejectedValueOnce(new Error('First call failed'))
        .mockRejectedValueOnce(new Error('First call retry 2'))
        .mockRejectedValueOnce(new Error('First call retry 3'))
        // Second embedText call: succeeds immediately
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [0.1, 0.2] }),
        });

      const result1 = await service.embedText('first');
      const result2 = await service.embedText('second');

      expect(result1).toEqual([]);
      expect(result2).toEqual([0.1, 0.2]);
    });

    it('should handle multiple consecutive errors', async () => {
      // 9 rejections total (3 retries per call × 3 calls)
      fetchSpy
        .mockRejectedValue(new Error('Persistent error'));

      const result1 = await service.embedText('text1');
      const result2 = await service.embedText('text2');
      const result3 = await service.embedText('text3');

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result3).toEqual([]);
      // Each call makes 3 fetch attempts
      expect(fetchSpy).toHaveBeenCalledTimes(9);
    });
  });

  describe('API Request Format', () => {
    it('should use POST method', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      });

      await service.embedText('test');

      const callOptions = fetchSpy.mock.calls[0][1];
      expect(callOptions.method).toBe('POST');
    });

    it('should use correct Content-Type header', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      });

      await service.embedText('test');

      const callOptions = fetchSpy.mock.calls[0][1];
      expect(callOptions.headers['Content-Type']).toBe('application/json');
    });

    it('should use Bearer token authentication', async () => {
      const token = 'specific-test-token-xyz';
      const svc = new VectorizeService('account', token);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      });

      await svc.embedText('test');

      const callOptions = fetchSpy.mock.calls[0][1];
      expect(callOptions.headers.Authorization).toBe('Bearer specific-test-token-xyz');
    });

    it('should include correct model in URL', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      });

      await service.embedText('test');

      const callUrl = fetchSpy.mock.calls[0][0];
      expect(callUrl).toContain('@cf/baai/bge-base-en-v1.5');
    });

    it('should send JSON body', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      });

      await service.embedText('test');

      const callOptions = fetchSpy.mock.calls[0][1];
      expect(() => JSON.parse(callOptions.body)).not.toThrow();
    });
  });
});
