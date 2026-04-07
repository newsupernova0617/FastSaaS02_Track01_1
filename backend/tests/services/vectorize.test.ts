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
  });

  describe('searchVectors', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table', 10);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept userId parameter', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table', 5, 'user-123');

      expect(result).toEqual([]);
    });

    it('should handle different table names', async () => {
      const tables = ['documents', 'messages', 'articles', 'custom_table'];

      for (const table of tables) {
        const result = await service.searchVectors([0.1, 0.2], table, 10);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      }
    });

    it('should handle different limit values', async () => {
      const limits = [1, 5, 10, 100, 1000];

      for (const limit of limits) {
        const result = await service.searchVectors([0.1, 0.2], 'test_table', limit);
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should handle empty embedding vector', async () => {
      const result = await service.searchVectors([], 'test_table', 10);

      expect(result).toEqual([]);
    });

    it('should handle high-dimensional vectors', async () => {
      const highDimVector = Array.from({ length: 768 }, (_, i) => i / 768);
      const result = await service.searchVectors(highDimVector, 'test_table', 10);

      expect(result).toEqual([]);
    });

    it('should handle undefined userId', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table', 10, undefined);

      expect(result).toEqual([]);
    });

    it('should handle empty userId string', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table', 10, '');

      expect(result).toEqual([]);
    });

    it('should handle negative limit gracefully', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table', -1);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle zero limit', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table', 0);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept special characters in table name', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table_$special', 10);

      expect(result).toEqual([]);
    });

    it('should handle numeric userId', async () => {
      const result = await service.searchVectors([0.1, 0.2], 'test_table', 10, '12345');

      expect(result).toEqual([]);
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
    it('should continue operation after error', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('First call failed'))
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
      fetchSpy.mockRejectedValue(new Error('Persistent error'));

      const result1 = await service.embedText('text1');
      const result2 = await service.embedText('text2');
      const result3 = await service.embedText('text3');

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result3).toEqual([]);
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
