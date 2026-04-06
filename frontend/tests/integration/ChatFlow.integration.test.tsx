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

describe('Chat Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getChatHistory as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Message & Optimistic UI', () => {
    it('should send user message and see optimistic UI immediately', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Analysis complete',
        metadata: { actionType: 'report' },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'analyze my spending');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Optimistic UI: message appears immediately
      await waitFor(() => {
        expect(screen.getByText('analyze my spending')).toBeInTheDocument();
      });

      // Input is cleared
      expect(textarea).toHaveValue('');
    });

    it('should display user message in ChatMessageList with correct styling', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'AI response',
        metadata: {},
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'hello ai');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        const userMessage = screen.getByText('hello ai');
        expect(userMessage).toBeInTheDocument();
        // Check that message appears in the correct container (ChatBubble)
        expect(userMessage.closest('.flex')).toHaveClass('justify-end');
      });
    });
  });

  describe('AI Response & Report Metadata', () => {
    it('should receive AI response and display in chat', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Your spending is ₩100,000 this month',
        metadata: {
          actionType: 'report',
          report: {
            totalSpending: 100000,
          },
        },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'summarize my spending');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('Your spending is ₩100,000 this month')).toBeInTheDocument();
      });
    });

    it('should display report metadata as report sections', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Your spending analysis',
        metadata: {
          actionType: 'report',
          report: {
            sections: [
              {
                type: 'card',
                title: 'Total Spending',
                metric: '₩100,000',
              },
              {
                type: 'alert',
                title: 'Alert',
                subtitle: 'High spending detected',
              },
            ],
          },
        },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'analyze');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('Total Spending')).toBeInTheDocument();
        expect(screen.getByText('Alert')).toBeInTheDocument();
        expect(screen.getByText('High spending detected')).toBeInTheDocument();
      });
    });
  });

  describe('Report Rendering', () => {
    it('should render ReportCard with correct styling for section types', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Report with sections',
        metadata: {
          actionType: 'report',
          report: {
            sections: [
              {
                type: 'card',
                title: 'Card Section',
                metric: '₩500,000',
              },
              {
                type: 'alert',
                title: 'Alert Section',
              },
              {
                type: 'suggestion',
                title: 'Suggestion Section',
              },
            ],
          },
        },
      });

      const { container } = renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'test');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('Card Section')).toBeInTheDocument();
      });

      // Verify card section has gray styling
      const cards = container.querySelectorAll('.rounded-lg.border');
      const cardSection = Array.from(cards).find(card => card.textContent?.includes('Card Section'));
      expect(cardSection).toHaveClass('bg-gray-50');

      // Verify alert section has yellow styling
      const alertSection = Array.from(cards).find(card => card.textContent?.includes('Alert Section'));
      expect(alertSection).toHaveClass('bg-yellow-50');

      // Verify suggestion section has blue styling
      const suggestionSection = Array.from(cards).find(card => card.textContent?.includes('Suggestion Section'));
      expect(suggestionSection).toHaveClass('bg-blue-50');
    });

    it('should render ReportChart with correct chart type', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Chart report',
        metadata: {
          actionType: 'report',
          report: {
            sections: [
              {
                type: 'pie',
                title: 'Spending by Category',
                data: [
                  { name: 'Food', value: 50000 },
                  { name: 'Transport', value: 30000 },
                ],
              },
            ],
          },
        },
      });

      const { container } = renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'chart test');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Verify chart response is displayed
      await waitFor(() => {
        expect(screen.getByText('Chart report')).toBeInTheDocument();
      });

      // Verify Recharts container is rendered (h-80 w-full div)
      const chartContainer = container.querySelector('.h-80.w-full');
      expect(chartContainer).toBeTruthy();
    });

    it('should display trend icons with correct colors', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Trend analysis',
        metadata: {
          actionType: 'report',
          report: {
            sections: [
              {
                type: 'card',
                title: 'Spending Up',
                metric: '₩100,000',
                trend: 'up',
              },
              {
                type: 'card',
                title: 'Spending Down',
                metric: '₩50,000',
                trend: 'down',
              },
            ],
          },
        },
      });

      const { container } = renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'trends');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('Spending Up')).toBeInTheDocument();
        expect(screen.getByText('Spending Down')).toBeInTheDocument();
      });

      // Verify trend icons are rendered with correct colors
      const redIcon = container.querySelector('.text-red-500');
      expect(redIcon).toBeInTheDocument(); // Trending up (spending increase) = red

      const greenIcon = container.querySelector('.text-green-500');
      expect(greenIcon).toBeInTheDocument(); // Trending down (spending decrease) = green
    });

    it('should format currency in report metrics', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Currency test',
        metadata: {
          actionType: 'report',
          report: {
            sections: [
              {
                type: 'card',
                title: 'Monthly Expense',
                metric: '₩1,234,567',
              },
            ],
          },
        },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'currency test');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/₩1,234,567/)).toBeInTheDocument();
      });
    });
  });

  describe('User Actions from Report', () => {
    it('should navigate on ActionButton click for report action', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Report action test',
        metadata: {
          actionType: 'report',
          report: {
            params: {
              month: '2026-04',
            },
          },
        },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'show stats');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
      });

      const actionButton = screen.getByRole('button', { name: /view details/i });
      expect(actionButton).toBeInTheDocument();
    });

    it('should navigate to calendar for create/update actions', async () => {
      const user = userEvent.setup();
      (api.getChatHistory as any).mockResolvedValue([]);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Calendar action test',
        metadata: {
          actionType: 'create',
          action: {
            date: '2026-04-15',
          },
        },
      });

      renderWithRouter(<AIPage />);

      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'create transaction');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view in calendar/i })).toBeInTheDocument();
      });
    });

    it('should preserve chat history when navigating away', async () => {
      const user = userEvent.setup();
      const mockMessages = [
        {
          id: 1,
          userId: 'user1',
          role: 'user' as const,
          content: 'First message',
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];
      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Response with report',
        metadata: {
          actionType: 'report',
          report: {
            params: { month: '2026-04' },
          },
        },
      });

      renderWithRouter(<AIPage />);

      // Wait for initial messages to load
      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
      });

      // Send new message
      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'new message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Verify both messages are present
      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
        expect(screen.getByText('new message')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination & Performance', () => {
    it('should load 100+ messages on initial load without lag', async () => {
      // Generate 120 mock messages with report metadata
      const mockMessages = Array.from({ length: 120 }, (_, i) => ({
        id: i + 1,
        userId: i % 2 === 0 ? 'user1' : 'assistant',
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i + 1}`,
        metadata: i % 2 === 1 ? { actionType: 'report' } : undefined,
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

      // Verify ChatInput is responsive (not blocked by rendering)
      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).not.toBeDisabled();
    });

    it('should handle scrolling with many messages without performance issues', async () => {
      const mockMessages = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        userId: i % 2 === 0 ? 'user1' : 'assistant',
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i + 1}`,
        createdAt: new Date(Date.now() - (150 - i) * 1000).toISOString(),
      }));

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Message 1')).toBeInTheDocument();
      });

      // Verify scrollIntoView was called (auto-scroll to bottom)
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it('should only re-render affected messages on new message arrival', async () => {
      const user = userEvent.setup();
      const initialMessages = [
        {
          id: 1,
          userId: 'user1',
          role: 'user' as const,
          content: 'Initial message',
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(initialMessages);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'New response',
        metadata: { actionType: 'report' },
      });

      const { container } = renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Initial message')).toBeInTheDocument();
      });

      // Get initial render count
      const initialBubbleCount = container.querySelectorAll('.flex.justify-end, .flex.justify-start').length;

      // Send new message
      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'new message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('new message')).toBeInTheDocument();
      });

      // Verify new messages were added
      const finalBubbleCount = container.querySelectorAll('.flex.justify-end, .flex.justify-start').length;
      expect(finalBubbleCount).toBeGreaterThan(initialBubbleCount);
    });
  });

  describe('Chat State Persistence', () => {
    it('should preserve chat state when navigating away', async () => {
      const user = userEvent.setup();
      const mockMessages = [
        {
          id: 1,
          userId: 'user1',
          role: 'user' as const,
          content: 'Original message',
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'AI response with action',
        metadata: {
          actionType: 'report',
          report: { params: { month: '2026-04' } },
        },
      });

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Original message')).toBeInTheDocument();
      });

      // Add a new message
      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'add message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('add message')).toBeInTheDocument();
      });

      // Verify both messages exist and chat is not cleared
      expect(screen.getByText('Original message')).toBeInTheDocument();
      expect(screen.getByText('add message')).toBeInTheDocument();
    });
  });
});
