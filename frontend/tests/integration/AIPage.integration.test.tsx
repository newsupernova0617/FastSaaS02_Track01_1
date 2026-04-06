import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AIPage from '../../src/pages/AIPage';
import * as api from '../../src/api';

// Mock the api module
vi.mock('../../src/api', () => ({
  sendAIMessage: vi.fn(),
  getChatHistory: vi.fn(),
  clearChatHistory: vi.fn(),
  setAuthToken: vi.fn(),
}));

// Helper function to render with Router
function renderWithRouter(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
}

describe('AIPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for getChatHistory
    (api.getChatHistory as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Load', () => {
    it('should call getChatHistory(100) on mount', async () => {
      (api.getChatHistory as any).mockResolvedValue([]);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(api.getChatHistory).toHaveBeenCalledWith(100);
      });
    });

    it('should update messages state from API response', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'user1',
          role: 'user' as const,
          content: 'Hello AI',
          createdAt: '2026-04-03T10:00:00Z',
        },
        {
          id: 2,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Hello! How can I help?',
          createdAt: '2026-04-03T10:00:05Z',
        },
      ];
      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeInTheDocument();
        expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
      });
    });

    it('should have error state as null on successful load', async () => {
      (api.getChatHistory as any).mockResolvedValue([]);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        // No error message should be visible
        const errorElements = screen.queryAllByText(/failed to load chat history/i);
        expect(errorElements).toHaveLength(0);
      });
    });
  });

  describe('Error on Load', () => {
    it('should set error state when getChatHistory fails', async () => {
      (api.getChatHistory as any).mockRejectedValue(new Error('Network error'));

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load chat history/i)).toBeInTheDocument();
      });
    });

    it('should display error message to user', async () => {
      const errorMsg = 'Failed to load chat history';
      (api.getChatHistory as any).mockRejectedValue(new Error(errorMsg));

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        const errorElement = screen.getByText(/failed to load chat history/i);
        expect(errorElement).toBeVisible();
        expect(errorElement).toHaveClass('text-red-700');
      });
    });
  });

  describe('Message Sending - Happy Path', () => {
    it('should call onSend when user enters text and submits', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'AI response',
        metadata: { actionType: 'report' },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'analyze my spending');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(api.sendAIMessage).toHaveBeenCalledWith('analyze my spending');
      });
    });

    it('should show optimistic UI: user message appears immediately', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves - simulates pending
      );

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, '분석해줘');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('분석해줘')).toBeInTheDocument();
      });
    });

    it('should set isLoading=true while sendAIMessage is pending', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'test message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        // Loading indicator should be visible
        expect(screen.getByText(/ai is thinking/i)).toBeInTheDocument();
      });
    });

    it('should add assistant response and metadata after receiving response', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Your spending increased 20% this month',
        metadata: {
          actionType: 'report',
          report: {
            totalSpending: 5000,
            percentageChange: 20,
          },
        },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'summarize my spending');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('Your spending increased 20% this month')).toBeInTheDocument();
      });
    });

    it('should set isLoading=false after response is received', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'AI response',
        metadata: {},
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'test message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        // Loading indicator should disappear
        expect(screen.queryByText(/ai is thinking/i)).not.toBeInTheDocument();
      });

      // Button should be re-enabled (textarea is now empty after sending)
      const button = screen.getByRole('button', { name: /send message/i });
      expect(button).toBeDisabled(); // Disabled because textarea is empty
    });
  });

  describe('Error Handling', () => {
    it('should set error state when sendAIMessage fails', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockRejectedValue(new Error('API error'));

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'test message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('API error')).toBeInTheDocument();
      });
    });

    it('should remove optimistic user message on error', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockRejectedValue(new Error('API error'));

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'failed message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        // The user message should be removed
        expect(screen.queryByText('failed message')).not.toBeInTheDocument();
      });
    });

    it('should clear input field and display error after failed message send', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockRejectedValue(new Error('API error'));

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i) as HTMLTextAreaElement;
      await user.type(textarea, 'test message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        // Input is cleared by ChatInput component after send attempt
        expect(textarea.value).toBe('');
        // Error message is displayed by AIPage container
        expect(screen.getByText('API error')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination/Performance', () => {
    it('should load 100+ messages without performance issues', async () => {
      // Generate 120 mock messages
      const mockMessages = Array.from({ length: 120 }, (_, i) => ({
        id: i + 1,
        userId: i % 2 === 0 ? 'user1' : 'assistant',
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i + 1}`,
        createdAt: new Date(Date.now() - (120 - i) * 1000).toISOString(),
      }));

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(api.getChatHistory).toHaveBeenCalledWith(100);
      });

      // Verify a sample of messages are rendered
      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 120')).toBeInTheDocument();

      // Verify ChatMessageList component is present (it handles scrollable container)
      const inputArea = screen.getByPlaceholderText(/ask about your finances/i);
      expect(inputArea).toBeInTheDocument();
    });
  });

  describe('UI Rendering', () => {
    it('should render header with title and description', async () => {
      (api.getChatHistory as any).mockResolvedValue([]);

      renderWithRouter(<AIPage />);

      expect(screen.getByText('AI Financial Assistant')).toBeInTheDocument();
      expect(screen.getByText(/ask about your finances and get insights/i)).toBeInTheDocument();
    });

    it('should render ChatMessageList and ChatInput components', async () => {
      (api.getChatHistory as any).mockResolvedValue([]);

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      expect(textarea).toBeInTheDocument();

      const button = screen.getByRole('button', { name: /send message/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Error Message Visibility', () => {
    it('should show error message in red banner', async () => {
      (api.getChatHistory as any).mockRejectedValue(new Error('Connection failed'));

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        const errorMessage = screen.getByText(/failed to load chat history/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-700');
      });
    });

    it('should clear error message when sending new message successfully', async () => {
      const user = userEvent.setup();
      // First load fails
      (api.getChatHistory as any).mockRejectedValue(new Error('Failed to load'));
      // Then message send succeeds
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Response',
      });

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load chat history/i)).toBeInTheDocument();
      });

      // Now send a message
      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'new message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        // Error message should be cleared
        expect(screen.queryByText(/failed to load chat history/i)).not.toBeInTheDocument();
      });
    });
  });
});
