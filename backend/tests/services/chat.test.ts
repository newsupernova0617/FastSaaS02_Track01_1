import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveMessageToSession, getChatHistoryBySession, deleteSessionMessages } from '../../src/services/chat';
import { chatMessages } from '../../src/db/schema';

describe('Chat Service - Session-Aware Functions', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      chatMessages,
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      all: vi.fn().mockResolvedValue([
        { id: 1, role: 'user', content: 'Hello', metadata: null, createdAt: '2026-04-07T00:00:00Z' },
        { id: 2, role: 'assistant', content: 'Hi there', metadata: null, createdAt: '2026-04-07T00:01:00Z' }
      ]),
    };
  });

  describe('saveMessageToSession', () => {
    it('should save message with sessionId', async () => {
      await saveMessageToSession(mockDb, 'user-123', 1, 'user', 'Test message');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 1,
          role: 'user',
          content: 'Test message',
        })
      );
    });

    it('should save metadata when provided', async () => {
      const metadata = { actionType: 'create' };
      await saveMessageToSession(mockDb, 'user-123', 1, 'assistant', 'Response', metadata);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: JSON.stringify(metadata),
        })
      );
    });

    it('should save null metadata when not provided', async () => {
      await saveMessageToSession(mockDb, 'user-123', 1, 'user', 'Message');

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        })
      );
    });
  });

  describe('getChatHistoryBySession', () => {
    it('should fetch messages for a session', async () => {
      const messages = await getChatHistoryBySession(mockDb, 1);

      expect(mockDb.where).toHaveBeenCalled();
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should parse metadata JSON', async () => {
      mockDb.all.mockResolvedValueOnce([
        { id: 1, role: 'assistant', content: 'Report', metadata: '{"actionType":"report"}', createdAt: '2026-04-07T00:00:00Z' }
      ]);

      const messages = await getChatHistoryBySession(mockDb, 1);

      expect(messages[0].metadata).toEqual({ actionType: 'report' });
    });

    it('should reverse message order for display (oldest first)', async () => {
      mockDb.all.mockResolvedValueOnce([
        { id: 2, role: 'assistant', content: 'Later', metadata: null, createdAt: '2026-04-07T00:01:00Z' },
        { id: 1, role: 'user', content: 'Earlier', metadata: null, createdAt: '2026-04-07T00:00:00Z' }
      ]);

      const messages = await getChatHistoryBySession(mockDb, 1);

      expect(messages[0].content).toBe('Earlier');
      expect(messages[1].content).toBe('Later');
    });

    it('should respect limit parameter', async () => {
      await getChatHistoryBySession(mockDb, 1, 20);

      expect(mockDb.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('deleteSessionMessages', () => {
    it('should delete all messages for a session', async () => {
      await deleteSessionMessages(mockDb, 1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should return number of deleted messages', async () => {
      mockDb.run.mockResolvedValueOnce({ rowsAffected: 5 });

      const count = await deleteSessionMessages(mockDb, 1);

      expect(count).toBe(5);
    });

    it('should handle zero deletions', async () => {
      mockDb.run.mockResolvedValueOnce({ rowsAffected: 0 });

      const count = await deleteSessionMessages(mockDb, 1);

      expect(count).toBe(0);
    });
  });
});
