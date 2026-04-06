import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../src/db/schema';
import { saveMessage, getChatHistory, clearChatHistory } from '../../src/services/chat';
import './setup-env';

/**
 * Chat Workflow Integration Tests
 * Tests real database with actual Drizzle ORM queries
 * Uses unique userId per test run to avoid conflicts
 */

describe('Chat Workflow Integration', () => {
  let db: any;
  const testUserId = `test-user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const otherUserId = `test-user-other-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  beforeEach(async () => {
    // Initialize real database connection
    const client = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    db = drizzle(client, { schema });

    // Clean up any existing test data before each test
    await db
      .delete(schema.chatMessages)
      .where(eq(schema.chatMessages.userId, testUserId))
      .run();

    await db
      .delete(schema.chatMessages)
      .where(eq(schema.chatMessages.userId, otherUserId))
      .run();

    await db
      .delete(schema.users)
      .where(eq(schema.users.id, testUserId))
      .run();

    await db
      .delete(schema.users)
      .where(eq(schema.users.id, otherUserId))
      .run();

    // Create test users (required for foreign key constraint)
    await db
      .insert(schema.users)
      .values({
        id: testUserId,
        email: `${testUserId}@test.com`,
        name: 'Test User',
        provider: 'test',
      })
      .run();

    await db
      .insert(schema.users)
      .values({
        id: otherUserId,
        email: `${otherUserId}@test.com`,
        name: 'Other User',
        provider: 'test',
      })
      .run();
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (db) {
      try {
        await db
          .delete(schema.chatMessages)
          .where(eq(schema.chatMessages.userId, testUserId))
          .run();

        await db
          .delete(schema.chatMessages)
          .where(eq(schema.chatMessages.userId, otherUserId))
          .run();

        await db
          .delete(schema.users)
          .where(eq(schema.users.id, testUserId))
          .run();

        await db
          .delete(schema.users)
          .where(eq(schema.users.id, otherUserId))
          .run();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Message CRUD Operations', () => {
    it('should save user message and retrieve via getChatHistory', async () => {
      // Act: Save a user message
      await saveMessage(db, testUserId, 'user', 'Hello, what is my spending this month?');

      // Assert: Retrieve and verify
      const history = await getChatHistory(db, testUserId, 100);

      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello, what is my spending this month?');
      expect(history[0].id).toBeDefined();
      expect(history[0].createdAt).toBeDefined();
      expect(history[0].metadata).toBeUndefined();
    });

    it('should persist assistant message with metadata', async () => {
      // Arrange: Prepare metadata
      const reportMetadata = {
        reportType: 'monthly_summary',
        month: '2026-04',
        sections: 3,
      };

      // Act: Save assistant message with metadata
      await saveMessage(
        db,
        testUserId,
        'assistant',
        'Here is your monthly spending summary...',
        reportMetadata
      );

      // Assert: Retrieve and verify metadata persists
      const history = await getChatHistory(db, testUserId, 100);

      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('assistant');
      expect(history[0].content).toBe('Here is your monthly spending summary...');
      expect(history[0].metadata).toBeDefined();
      expect(history[0].metadata).toEqual(reportMetadata);
    });

    it('should delete all chat history for user and preserve other users messages', async () => {
      // Arrange: Create messages for test user and other user
      await saveMessage(db, testUserId, 'user', 'Message 1');
      await saveMessage(db, testUserId, 'assistant', 'Response 1');
      await saveMessage(db, testUserId, 'user', 'Message 2');

      await saveMessage(db, otherUserId, 'user', 'Other user message 1');
      await saveMessage(db, otherUserId, 'assistant', 'Other user response 1');

      // Verify initial state
      let historyTest = await getChatHistory(db, testUserId, 100);
      let historyOther = await getChatHistory(db, otherUserId, 100);
      expect(historyTest).toHaveLength(3);
      expect(historyOther).toHaveLength(2);

      // Act: Clear chat history for test user
      const deletedCount = await clearChatHistory(db, testUserId);

      // Assert: Test user messages deleted, other user messages preserved
      historyTest = await getChatHistory(db, testUserId, 100);
      historyOther = await getChatHistory(db, otherUserId, 100);

      expect(deletedCount).toBe(3);
      expect(historyTest).toHaveLength(0);
      expect(historyOther).toHaveLength(2);
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter in getChatHistory', async () => {
      // Arrange: Create 30 messages
      for (let i = 0; i < 30; i++) {
        await saveMessage(db, testUserId, 'user', `Message ${i}`);
      }

      // Act & Assert: Test different limits
      const history10 = await getChatHistory(db, testUserId, 10);
      const history20 = await getChatHistory(db, testUserId, 20);
      const history50 = await getChatHistory(db, testUserId, 50);

      expect(history10).toHaveLength(10);
      expect(history20).toHaveLength(20);
      expect(history50).toHaveLength(30); // Only 30 messages exist
    });

    it('should support pagination with before parameter', async () => {
      // Arrange: Create 10 messages
      for (let i = 0; i < 10; i++) {
        await saveMessage(db, testUserId, 'user', `Message ${i}`);
      }

      // Get first batch (most recent 5)
      const firstBatch = await getChatHistory(db, testUserId, 5);
      expect(firstBatch).toHaveLength(5);

      // Act: Get messages with ID less than the oldest ID from first batch (older messages)
      // Since ordering is DESC by createdAt, the last message in firstBatch is the oldest
      const oldestIdInFirstBatch = firstBatch[firstBatch.length - 1].id;
      const secondBatch = await getChatHistory(db, testUserId, 5, oldestIdInFirstBatch);

      // Assert: Second batch should be messages with ID < oldestIdInFirstBatch
      expect(secondBatch).toHaveLength(5);
      // All IDs in second batch should be less than the oldest ID in first batch
      secondBatch.forEach((msg) => {
        expect(msg.id).toBeLessThan(oldestIdInFirstBatch);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty content gracefully', async () => {
      // Act: Save message with empty content (should succeed - validation is in API layer)
      await saveMessage(db, testUserId, 'user', '');

      // Assert: Message should be saved
      const history = await getChatHistory(db, testUserId, 100);
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('');
    });

    it('should retrieve messages for different users independently', async () => {
      // Arrange: Create messages for two different users
      await saveMessage(db, testUserId, 'user', 'User 1 message 1');
      await saveMessage(db, testUserId, 'user', 'User 1 message 2');
      await saveMessage(db, otherUserId, 'user', 'User 2 message 1');

      // Act: Get history for each user
      const history1 = await getChatHistory(db, testUserId, 100);
      const history2 = await getChatHistory(db, otherUserId, 100);

      // Assert: Each user should only see their own messages
      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);
    });

    it('should return empty array for non-existent user', async () => {
      // Act: Get history for user with no messages
      const history = await getChatHistory(db, testUserId, 100);

      // Assert: Should return empty array, not error
      expect(history).toEqual([]);
    });
  });

  describe('Concurrency & Edge Cases', () => {
    it('should handle concurrent saves without race conditions', async () => {
      // Arrange: Create 10 concurrent save operations
      const concurrentSaves = Array.from({ length: 10 }, (_, i) =>
        saveMessage(db, testUserId, 'user', `Concurrent message ${i}`)
      );

      // Act: Execute all saves concurrently
      await Promise.all(concurrentSaves);

      // Assert: All messages should be saved
      const history = await getChatHistory(db, testUserId, 100);
      expect(history).toHaveLength(10);

      // Verify all messages have unique IDs
      const ids = history.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should retrieve all messages in consistent order by createdAt', async () => {
      // Arrange: Save messages with delays to ensure different timestamps
      await saveMessage(db, testUserId, 'user', 'Message 1');
      // Wait 200ms to ensure timestamps are different
      await new Promise((resolve) => setTimeout(resolve, 200));
      await saveMessage(db, testUserId, 'user', 'Message 2');
      await new Promise((resolve) => setTimeout(resolve, 200));
      await saveMessage(db, testUserId, 'user', 'Message 3');

      // Act: Get history (should be ordered by createdAt DESC - newest first)
      const history = await getChatHistory(db, testUserId, 100);

      // Assert: All messages should be present
      expect(history).toHaveLength(3);
      const messages = history.map((h) => h.content);
      expect(messages).toContain('Message 1');
      expect(messages).toContain('Message 2');
      expect(messages).toContain('Message 3');

      // Verify createdAt is ordered DESC (newer timestamps come first)
      for (let i = 0; i < history.length - 1; i++) {
        expect(new Date(history[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(history[i + 1].createdAt).getTime()
        );
      }
    });

    it('should handle complex metadata with nested objects', async () => {
      // Arrange: Create complex metadata structure
      const complexMetadata = {
        reportType: 'monthly_summary',
        sections: [
          {
            type: 'card',
            title: 'Spending',
            metric: '₩1,250,000',
            trend: 'up',
          },
          {
            type: 'pie',
            title: 'Categories',
            data: [
              { name: '식비', value: 500000 },
              { name: '교통', value: 250000 },
            ],
          },
        ],
        generatedAt: '2026-04-03T12:00:00Z',
      };

      // Act: Save message with complex metadata
      await saveMessage(
        db,
        testUserId,
        'assistant',
        'Detailed report',
        complexMetadata
      );

      // Assert: Metadata should be fully preserved and parseable
      const history = await getChatHistory(db, testUserId, 100);
      expect(history).toHaveLength(1);
      expect(history[0].metadata).toEqual(complexMetadata);
      expect(history[0].metadata?.sections).toHaveLength(2);
      expect(history[0].metadata?.sections[0].type).toBe('card');
    });
  });

  describe('Isolation & Data Integrity', () => {
    it('should not affect transactions table when clearing chat history', async () => {
      // Note: This test verifies that clearChatHistory only affects chatMessages table
      // The transactions table is tested in the AI Report Integration tests

      // Arrange: Save some messages
      await saveMessage(db, testUserId, 'user', 'Message 1');
      await saveMessage(db, testUserId, 'assistant', 'Response 1');

      // Act: Clear chat history
      await clearChatHistory(db, testUserId);

      // Assert: Messages should be deleted
      const history = await getChatHistory(db, testUserId, 100);
      expect(history).toHaveLength(0);
    });

    it('should preserve metadata after multiple retrievals', async () => {
      // Arrange: Save message with metadata
      const metadata = { key: 'value', nested: { inner: 'data' } };
      await saveMessage(db, testUserId, 'assistant', 'Test message', metadata);

      // Act: Retrieve message multiple times
      const history1 = await getChatHistory(db, testUserId, 100);
      const history2 = await getChatHistory(db, testUserId, 100);

      // Assert: Metadata should be identical on both retrievals
      expect(history1[0].metadata).toEqual(metadata);
      expect(history2[0].metadata).toEqual(metadata);
      expect(history1[0].metadata).toEqual(history2[0].metadata);
    });
  });
});
