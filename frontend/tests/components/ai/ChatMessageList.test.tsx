import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatMessageList from '../../../src/components/ai/ChatMessageList';
import type { ChatMessage } from '../../../src/api';

// Mock ChatBubble component
vi.mock('../../../src/components/ai/ChatBubble', () => ({
  default: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`chat-bubble-${message.id}`}>{message.content}</div>
  ),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('ChatMessageList Component', () => {
  // Test 1: Show welcome message when messages array is empty
  it('should show welcome message when messages array is empty', () => {
    render(<ChatMessageList messages={[]} />);

    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(
      screen.getByText(/Ask me about your finances, spending patterns/i)
    ).toBeInTheDocument();
  });

  // Test 2: Auto-scroll to bottom when messages change
  it('should render all messages and scroll anchor', () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        userId: 'user123',
        role: 'user',
        content: 'First message',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        userId: 'assistant',
        role: 'assistant',
        content: 'Response',
        createdAt: '2024-01-01T00:01:00Z',
      },
    ];

    render(<ChatMessageList messages={messages} />);

    // Both messages should be rendered via ChatBubble
    expect(screen.getByTestId('chat-bubble-1')).toBeInTheDocument();
    expect(screen.getByTestId('chat-bubble-2')).toBeInTheDocument();
  });

  // Test 3: Show loading indicator with 3 animated dots when isLoading=true
  it('should show loading indicator when isLoading=true', () => {
    render(<ChatMessageList messages={[]} isLoading={true} />);

    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    // Check for animated dots (3 divs with animate-bounce)
    const bouncingDots = document.querySelectorAll(
      '.w-2.h-2.bg-gray-400.rounded-full.animate-bounce'
    );
    expect(bouncingDots.length).toBe(3);
  });

  // Test 4: Hide welcome message when messages exist
  it('should not show welcome message when messages exist', () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        userId: 'user123',
        role: 'user',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    render(<ChatMessageList messages={messages} />);

    expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument();
  });

  // Test 5: Hide loading indicator when isLoading=false
  it('should not show loading indicator when isLoading=false', () => {
    render(<ChatMessageList messages={[]} isLoading={false} />);

    expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
  });

  // Test 6: Render multiple messages correctly
  it('should render multiple messages as ChatBubbles', () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        userId: 'user123',
        role: 'user',
        content: 'Message 1',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        userId: 'assistant',
        role: 'assistant',
        content: 'Message 2',
        createdAt: '2024-01-01T00:01:00Z',
      },
      {
        id: 3,
        userId: 'user123',
        role: 'user',
        content: 'Message 3',
        createdAt: '2024-01-01T00:02:00Z',
      },
    ];

    render(<ChatMessageList messages={messages} />);

    expect(screen.getByTestId('chat-bubble-1')).toBeInTheDocument();
    expect(screen.getByTestId('chat-bubble-2')).toBeInTheDocument();
    expect(screen.getByTestId('chat-bubble-3')).toBeInTheDocument();
  });
});
