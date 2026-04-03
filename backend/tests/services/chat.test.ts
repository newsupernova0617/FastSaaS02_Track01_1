import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveMessage, getChatHistory, clearChatHistory } from '../../src/services/chat';
import {
  TEST_USER_ID,
  TEST_USER_ID_OTHER,
  createMockChatMessage,
  createAssistantMessage,
  createNewChatMessage,
} from '../fixtures/test-data';
import type { ChatMessage } from '../../src/db/schema';

/**
 * Unit tests for Chat Service
 * Tests saveMessage, getChatHistory, and clearChatHistory with mocked database
 */

describe('Chat Service', () => {
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create a mock database object
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('saveMessage', () => {
    it('should save user message without metadata', async () => {
      // Setup: Create mock insert chain
      const mockInsertChain = {
        values: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.insert.mockReturnValue(mockInsertChain);

      // Execute
      await saveMessage(mockDb, TEST_USER_ID, 'user', 'Hello assistant');

      // Verify
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        role: 'user',
        content: 'Hello assistant',
        metadata: null,
      });
    });

    it('should save message with metadata', async () => {
      // Setup
      const testMetadata = { reportId: '123', type: 'monthly_summary' };
      const mockInsertChain = {
        values: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.insert.mockReturnValue(mockInsertChain);

      // Execute
      await saveMessage(
        mockDb,
        TEST_USER_ID,
        'assistant',
        'Here is your report',
        testMetadata
      );

      // Verify
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        role: 'assistant',
        content: 'Here is your report',
        metadata: JSON.stringify(testMetadata),
      });
    });

    it('should handle metadata as null when not provided', async () => {
      // Setup
      const mockInsertChain = {
        values: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.insert.mockReturnValue(mockInsertChain);

      // Execute
      await saveMessage(mockDb, TEST_USER_ID, 'user', 'Another message');

      // Verify that metadata is null when not provided
      const callArgs = mockInsertChain.values.mock.calls[0][0];
      expect(callArgs.metadata).toBeNull();
    });
  });

  describe('getChatHistory', () => {
    it('should apply limit parameter', async () => {
      // Setup: Create mock messages
      const mockMessages: ChatMessage[] = [
        createMockChatMessage({ id: 1, content: 'msg1' }),
        createMockChatMessage({ id: 2, content: 'msg2' }),
        createMockChatMessage({ id: 3, content: 'msg3' }),
      ];

      // Create a chainable mock that supports multiple where() calls and all() at the end
      const whereMock = vi.fn();
      const limitMock = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue(mockMessages.slice(0, 2)),
      });
      const orderByMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });
      const whereChain = {
        where: whereMock,
        orderBy: orderByMock,
      };
      whereMock.mockReturnValue(whereChain);

      const mockSelectChain = {
        from: vi.fn().mockReturnValue(whereChain),
      };
      mockDb.select.mockReturnValue(mockSelectChain);

      // Execute
      const result = await getChatHistory(mockDb, TEST_USER_ID, 2);

      // Verify that limit was called with correct value
      expect(limitMock).toHaveBeenCalledWith(2);
      expect(result).toHaveLength(2);
    });

    it('should apply beforeId cursor pagination', async () => {
      // Setup: Simulate beforeId cursor filter
      const mockMessages: ChatMessage[] = [
        createMockChatMessage({ id: 2, content: 'msg2' }),
      ];

      // Create a chainable mock - where() returns itself for chaining
      const whereMock = vi.fn();
      const whereChain = {
        where: whereMock,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue(mockMessages),
          }),
        }),
      };
      // Make where() return the chain itself
      whereMock.mockReturnValue(whereChain);

      const mockSelectChain = {
        from: vi.fn().mockReturnValue(whereChain),
      };
      mockDb.select.mockReturnValue(mockSelectChain);

      // Execute - getChatHistory should filter by beforeId (id < beforeId)
      const result = await getChatHistory(mockDb, TEST_USER_ID, 50, 3);

      // Verify the where method was called twice (once for userId, once for beforeId)
      expect(whereMock).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no messages exist', async () => {
      // Setup
      const whereMock = vi.fn();
      const whereChain = {
        where: whereMock,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      whereMock.mockReturnValue(whereChain);

      const mockSelectChain = {
        from: vi.fn().mockReturnValue(whereChain),
      };
      mockDb.select.mockReturnValue(mockSelectChain);

      // Execute
      const result = await getChatHistory(mockDb, TEST_USER_ID);

      // Verify
      expect(result).toEqual([]);
    });

    it('should filter by userId and exclude other users', async () => {
      // Setup: Messages from a specific user
      const userMessages: ChatMessage[] = [
        createMockChatMessage({ id: 1, userId: TEST_USER_ID, content: 'msg1' }),
        createMockChatMessage({ id: 2, userId: TEST_USER_ID, content: 'msg2' }),
      ];

      const whereMock = vi.fn();
      const whereChain = {
        where: whereMock,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue(userMessages),
          }),
        }),
      };
      whereMock.mockReturnValue(whereChain);

      const mockSelectChain = {
        from: vi.fn().mockReturnValue(whereChain),
      };
      mockDb.select.mockReturnValue(mockSelectChain);

      // Execute
      const result = await getChatHistory(mockDb, TEST_USER_ID);

      // Verify that where was called (filtering by userId)
      expect(whereMock).toHaveBeenCalled();
      // Result should contain messages and have the expected structure
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('content');
      expect(result[0]).toHaveProperty('createdAt');
    });

    it('should parse metadata JSON strings back to objects', async () => {
      // Setup: Message with metadata as JSON string
      const metadata = { reportId: '123', type: 'monthly_summary' };
      const mockMessages: ChatMessage[] = [
        createAssistantMessage('Here is your report', metadata),
      ];

      const whereMock = vi.fn();
      const whereChain = {
        where: whereMock,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue(mockMessages),
          }),
        }),
      };
      whereMock.mockReturnValue(whereChain);

      const mockSelectChain = {
        from: vi.fn().mockReturnValue(whereChain),
      };
      mockDb.select.mockReturnValue(mockSelectChain);

      // Execute
      const result = await getChatHistory(mockDb, TEST_USER_ID);

      // Verify metadata is parsed back to object
      expect(result).toHaveLength(1);
      expect(typeof result[0].metadata).toBe('object');
      if (result[0].metadata) {
        expect((result[0].metadata as any).reportId).toBe('123');
      }
    });
  });

  describe('clearChatHistory', () => {
    it('should delete all messages for user', async () => {
      // Setup
      const mockDeleteChain = {
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ rowsAffected: 5 }),
        }),
      };
      mockDb.delete.mockReturnValue(mockDeleteChain);

      // Execute
      await clearChatHistory(mockDb, TEST_USER_ID);

      // Verify delete was called
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDeleteChain.where).toHaveBeenCalled();
    });

    it('should return count of deleted messages', async () => {
      // Setup
      const mockDeleteChain = {
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ rowsAffected: 5 }),
        }),
      };
      mockDb.delete.mockReturnValue(mockDeleteChain);

      // Execute
      const result = await clearChatHistory(mockDb, TEST_USER_ID);

      // Verify
      expect(result).toBe(5);
    });

    it('should return 0 when no messages are deleted', async () => {
      // Setup: No rows affected
      const mockDeleteChain = {
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
        }),
      };
      mockDb.delete.mockReturnValue(mockDeleteChain);

      // Execute
      const result = await clearChatHistory(mockDb, TEST_USER_ID);

      // Verify
      expect(result).toBe(0);
    });

    it('should handle missing rowsAffected property', async () => {
      // Setup: Database returns undefined rowsAffected
      const mockDeleteChain = {
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({}),
        }),
      };
      mockDb.delete.mockReturnValue(mockDeleteChain);

      // Execute
      const result = await clearChatHistory(mockDb, TEST_USER_ID);

      // Verify - should return 0 when rowsAffected is not available
      expect(result).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle message with empty content', async () => {
      // Setup
      const mockInsertChain = {
        values: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.insert.mockReturnValue(mockInsertChain);

      // Execute
      await saveMessage(mockDb, TEST_USER_ID, 'user', '');

      // Verify
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        role: 'user',
        content: '',
        metadata: null,
      });
    });

    it('should handle metadata with nested objects', async () => {
      // Setup
      const complexMetadata = {
        reportId: '123',
        data: {
          nested: {
            value: 'test',
          },
        },
        items: [1, 2, 3],
      };
      const mockInsertChain = {
        values: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.insert.mockReturnValue(mockInsertChain);

      // Execute
      await saveMessage(
        mockDb,
        TEST_USER_ID,
        'assistant',
        'Complex report',
        complexMetadata
      );

      // Verify
      const callArgs = mockInsertChain.values.mock.calls[0][0];
      expect(callArgs.metadata).toBe(JSON.stringify(complexMetadata));
      // Verify it can be parsed back
      expect(JSON.parse(callArgs.metadata)).toEqual(complexMetadata);
    });
  });
});
