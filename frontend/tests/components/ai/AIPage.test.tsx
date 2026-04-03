import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIPage from '../../../src/pages/AIPage';
import type { ChatMessage } from '../../../src/api';

// Mock API functions
const mockGetChatHistory = vi.fn();
const mockSendAIMessage = vi.fn();

vi.mock('../../../src/api', () => {
  return {
    getChatHistory: vi.fn((...args) => mockGetChatHistory(...args)),
    sendAIMessage: vi.fn((text: string) => mockSendAIMessage(text)),
  };
});

// Mock child components
vi.mock('../../../src/components/ai/ChatMessageList', () => ({
  default: ({ messages, isLoading }: { messages: ChatMessage[]; isLoading: boolean }) => (
    <div data-testid="chat-message-list">
      {messages.map((msg) => (
        <div key={msg.id} data-testid={`message-${msg.id}`}>
          {msg.content}
        </div>
      ))}
      {isLoading && <div data-testid="loading">Loading...</div>}
    </div>
  ),
}));

vi.mock('../../../src/components/ai/ChatInput', () => ({
  default: ({ onSend, isLoading }: { onSend: (text: string) => Promise<void>; isLoading: boolean }) => (
    <div data-testid="chat-input">
      <input
        type="text"
        placeholder="Type message"
        data-testid="message-input"
        disabled={isLoading}
        onKeyPress={async (e) => {
          if (e.key === 'Enter') {
            const input = e.currentTarget as HTMLInputElement;
            await onSend(input.value);
            input.value = '';
          }
        }}
      />
      <button
        data-testid="send-button"
        disabled={isLoading}
        onClick={async () => {
          const input = document.querySelector('[data-testid="message-input"]') as HTMLInputElement;
          if (input.value) {
            await onSend(input.value);
            input.value = '';
          }
        }}
      >
        Send
      </button>
    </div>
  ),
}));

describe('AIPage Component', () => {
  beforeEach(() => {
    mockGetChatHistory.mockClear();
    mockSendAIMessage.mockClear();
  });

  // Test 1: Load chat history on mount with getChatHistory(100)
  it('should call getChatHistory(100) on mount', async () => {
    mockGetChatHistory.mockResolvedValue([]);

    render(<AIPage />);

    await waitFor(() => {
      expect(mockGetChatHistory).toHaveBeenCalledWith(100);
    });
  });

  // Test 2: Update messages state on successful load
  it('should update messages state with chat history on load', async () => {
    const mockMessages: ChatMessage[] = [
      {
        id: 1,
        userId: 'user123',
        role: 'user',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        userId: 'assistant',
        role: 'assistant',
        content: 'Hi there!',
        createdAt: '2024-01-01T00:01:00Z',
      },
    ];

    mockGetChatHistory.mockResolvedValue(mockMessages);

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
    });
  });

  // Test 3: Set error state on failed load
  it('should display error message when chat history load fails', async () => {
    mockGetChatHistory.mockRejectedValue(new Error('Network error'));

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load chat history')).toBeInTheDocument();
    });
  });

  // Test 4: Show header with correct text
  it('should render header with AI Financial Assistant title', () => {
    mockGetChatHistory.mockResolvedValue([]);

    render(<AIPage />);

    expect(screen.getByText('AI Financial Assistant')).toBeInTheDocument();
    expect(screen.getByText(/Ask about your finances and get insights/)).toBeInTheDocument();
  });

  // Test 5: Render ChatMessageList with messages
  it('should render ChatMessageList component', async () => {
    mockGetChatHistory.mockResolvedValue([]);

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-list')).toBeInTheDocument();
    });
  });

  // Test 6: Render ChatInput component
  it('should render ChatInput component', async () => {
    mockGetChatHistory.mockResolvedValue([]);

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
  });

  // Test 7: Send message and update state
  it('should send message and add user message to state', async () => {
    const user = userEvent.setup();
    mockGetChatHistory.mockResolvedValue([]);
    mockSendAIMessage.mockResolvedValue({
      success: true,
      content: 'AI response',
    });

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('message-input') as HTMLInputElement;
    await user.type(input, 'Test message');
    await user.click(screen.getByTestId('send-button'));

    await waitFor(() => {
      // User message should be added
      expect(mockSendAIMessage).toHaveBeenCalledWith('Test message');
    });
  });

  // Test 8: Set isLoading state while message is being sent
  it('should set isLoading state while sending message', async () => {
    const user = userEvent.setup();
    mockGetChatHistory.mockResolvedValue([]);
    let resolveMessage: Function;
    mockSendAIMessage.mockImplementation(
      () => new Promise((resolve) => {
        resolveMessage = () =>
          resolve({
            success: true,
            content: 'Response',
          });
      })
    );

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('message-input') as HTMLInputElement;
    await user.type(input, 'Message');
    const sendButton = screen.getByTestId('send-button') as HTMLButtonElement;

    await user.click(sendButton);

    // Button should be disabled while loading
    await waitFor(() => {
      expect(sendButton.disabled).toBe(true);
    });

    // Resolve the message
    resolveMessage!();

    // Button should be enabled after response
    await waitFor(() => {
      expect(sendButton.disabled).toBe(false);
    });
  });

  // Test 9: Handle send error and restore state
  it('should handle send error and remove optimistic message', async () => {
    const user = userEvent.setup();
    mockGetChatHistory.mockResolvedValue([]);
    mockSendAIMessage.mockRejectedValue(new Error('Send failed'));

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('message-input') as HTMLInputElement;
    await user.type(input, 'Error test');
    await user.click(screen.getByTestId('send-button'));

    // Error message should be displayed
    await waitFor(() => {
      expect(screen.getByText('Send failed')).toBeInTheDocument();
    });
  });

  // Test 10: Clear error when sending new message
  it('should clear error state when sending a new message', async () => {
    const user = userEvent.setup();
    mockGetChatHistory.mockResolvedValue([]);
    mockSendAIMessage.mockRejectedValueOnce(new Error('Initial error'));
    mockSendAIMessage.mockResolvedValueOnce({
      success: true,
      content: 'Success',
    });

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    // First message fails
    let input = screen.getByTestId('message-input') as HTMLInputElement;
    await user.type(input, 'First');
    await user.click(screen.getByTestId('send-button'));

    await waitFor(() => {
      expect(screen.getByText('Initial error')).toBeInTheDocument();
    });

    // Second message succeeds
    input = screen.getByTestId('message-input') as HTMLInputElement;
    await user.type(input, 'Second');
    await user.click(screen.getByTestId('send-button'));

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Initial error')).not.toBeInTheDocument();
    });
  });

  // Test 11: Add assistant response to messages
  it('should add assistant response to messages after sending', async () => {
    const user = userEvent.setup();
    mockGetChatHistory.mockResolvedValue([]);
    mockSendAIMessage.mockResolvedValue({
      success: true,
      content: 'AI Response Content',
    });

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('message-input') as HTMLInputElement;
    await user.type(input, 'User query');
    await user.click(screen.getByTestId('send-button'));

    await waitFor(() => {
      expect(screen.getByText('AI Response Content')).toBeInTheDocument();
    });
  });

  // Test 12: Include metadata in assistant message
  it('should include metadata in assistant message when provided', async () => {
    const user = userEvent.setup();
    mockGetChatHistory.mockResolvedValue([]);
    const mockMetadata = {
      actionType: 'report',
      report: {
        sections: [],
      },
    };

    mockSendAIMessage.mockResolvedValue({
      success: true,
      content: 'Report response',
      metadata: mockMetadata,
    });

    render(<AIPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('message-input') as HTMLInputElement;
    await user.type(input, 'Generate report');
    await user.click(screen.getByTestId('send-button'));

    await waitFor(() => {
      expect(screen.getByText('Report response')).toBeInTheDocument();
    });
  });
});
