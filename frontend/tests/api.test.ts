import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendAIMessage, getChatHistory, clearChatHistory, setAuthToken } from '../src/api';

describe('API Functions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Clear auth token
    setAuthToken(null);
    // Mock fetch
    global.fetch = vi.fn();
  });

  describe('sendAIMessage()', () => {
    it('should POST to /api/ai/action with text parameter', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          content: 'AI response',
          metadata: { actionType: 'report' },
        }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await sendAIMessage('test message');

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const url = callArgs[0];
      const config = callArgs[1];

      expect(url).toContain('/api/ai/action');
      expect(config.method).toBe('POST');
      expect(config.headers['Content-Type']).toBe('application/json');

      // Check that the body contains the text
      const body = JSON.parse(config.body);
      expect(body.text).toBe('test message');

      expect(result.success).toBe(true);
      expect(result.content).toBe('AI response');
    });

    it('should include Authorization header when token is set', async () => {
      setAuthToken('test-token-123');

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          content: 'AI response',
          metadata: {},
        }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await sendAIMessage('test');

      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['Authorization']).toBe('Bearer test-token-123');
    });

    it('should parse response with success, content, and metadata', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          content: 'Detailed analysis of your expenses',
          metadata: {
            actionType: 'report',
            report: {
              totalSpending: 5000,
              byCategory: { food: 1500, transport: 500 },
            },
          },
        }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await sendAIMessage('analyze my spending');

      expect(result.success).toBe(true);
      expect(result.content).toBe('Detailed analysis of your expenses');
      expect(result.metadata?.actionType).toBe('report');
      expect(result.metadata?.report).toEqual({
        totalSpending: 5000,
        byCategory: { food: 1500, transport: 500 },
      });
    });

    it('should throw error on network/API failure', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'Internal server error' }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(sendAIMessage('test')).rejects.toThrow('Failed to send AI message');
    });
  });

  describe('getChatHistory()', () => {
    it('should GET /api/ai/chat/history with default parameters', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          messages: [
            {
              id: 1,
              userId: 'user1',
              role: 'user',
              content: 'Hello',
              createdAt: '2026-04-03T00:00:00Z',
            },
          ],
        }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await getChatHistory();

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const url = callArgs[0];
      const config = callArgs[1];

      expect(url).toContain('/api/ai/chat/history');
      // GET is default, so method should be undefined or 'GET'
      const isGetRequest = !config.method || config.method === 'GET';
      expect(isGetRequest).toBe(true);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].content).toBe('Hello');
    });

    it('should pass limit and before query parameters correctly', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messages: [] }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await getChatHistory(20, 123);

      const callArgs = (global.fetch as any).mock.calls[0];
      const url = callArgs[0];

      expect(url).toContain('limit=20');
      expect(url).toContain('before=123');
    });

    it('should return empty array when no messages exist', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messages: [] }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await getChatHistory(50);

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(getChatHistory()).rejects.toThrow('Failed to fetch chat history');
    });
  });

  describe('clearChatHistory()', () => {
    it('should DELETE /api/ai/chat/history', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ deletedCount: 5 }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await clearChatHistory();

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const url = callArgs[0];
      const config = callArgs[1];

      expect(url).toContain('/api/ai/chat/history');
      expect(config.method).toBe('DELETE');
    });

    it('should return deletedCount from response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ deletedCount: 42 }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await clearChatHistory();

      expect(result).toBe(42);
    });

    it('should return 0 if deletedCount is missing from response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await clearChatHistory();

      expect(result).toBe(0);
    });

    it('should throw error on API failure', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'Failed to delete' }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(clearChatHistory()).rejects.toThrow('Failed to clear chat history');
    });
  });

  describe('Edge cases', () => {
    it('should handle missing Authorization header when token is not set', async () => {
      setAuthToken(null);

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          content: 'Response',
        }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await sendAIMessage('test');

      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers;

      // Authorization header should not be present when token is null
      expect(headers['Authorization']).toBeUndefined();
    });
  });
});
