import type { ChatMessage, NewChatMessage } from '../../src/db/schema';

/**
 * Test constants and fixtures for chat service tests
 */

export const TEST_USER_ID = 'test-user-unit-chat';
export const TEST_USER_ID_OTHER = 'test-user-unit-chat-other';

/**
 * Creates a mock chat message with default values
 * @param override - Partial object to override default values
 * @returns ChatMessage object
 */
export function createMockChatMessage(override?: Partial<ChatMessage>): ChatMessage {
  return {
    id: 1,
    userId: TEST_USER_ID,
    sessionId: null,
    role: 'user',
    content: 'Test message',
    metadata: null,
    createdAt: '2024-03-15T12:00:00Z',
    ...override,
  };
}

/**
 * Creates a mock assistant message with optional metadata
 * @param content - Message content
 * @param metadata - Optional metadata object (will be stored as string in DB)
 * @returns ChatMessage object
 */
export function createAssistantMessage(
  content: string,
  metadata?: Record<string, unknown>
): ChatMessage {
  return {
    id: 2,
    userId: TEST_USER_ID,
    sessionId: null,
    role: 'assistant',
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: '2024-03-15T12:05:00Z',
  };
}

/**
 * Creates a new (insert) chat message object
 * @param override - Partial object to override default values
 * @returns NewChatMessage object (for insert operations)
 */
export function createNewChatMessage(override?: Partial<NewChatMessage>): NewChatMessage {
  return {
    userId: TEST_USER_ID,
    sessionId: null,
    role: 'user',
    content: 'Test message',
    metadata: null,
    ...override,
  };
}
