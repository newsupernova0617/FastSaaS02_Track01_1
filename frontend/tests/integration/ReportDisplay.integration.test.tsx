import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('Report Display Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Load & Display', () => {
    it('should display chat messages with embedded report sections', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'user1',
          role: 'assistant' as const,
          content: 'Analysis complete',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Total Spending',
                  metric: '₩500,000',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Analysis complete')).toBeInTheDocument();
        expect(screen.getByText('Total Spending')).toBeInTheDocument();
      });
    });

    it('should extract and display report metadata from getChatHistory response', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Your financial summary',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Monthly Income',
                  metric: '₩3,000,000',
                },
                {
                  type: 'card',
                  title: 'Monthly Expense',
                  metric: '₩2,000,000',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Monthly Income')).toBeInTheDocument();
        expect(screen.getByText('Monthly Expense')).toBeInTheDocument();
      });
    });

    it('should load multiple report sections and display all of them', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Complete report',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Summary',
                  metric: '₩100,000',
                },
                {
                  type: 'alert',
                  title: 'Warning',
                  subtitle: 'Budget exceeded',
                },
                {
                  type: 'suggestion',
                  title: 'Tip',
                  subtitle: 'Save more next month',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument();
        expect(screen.getByText('Warning')).toBeInTheDocument();
        expect(screen.getByText('Tip')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Type Rendering', () => {
    it('should render pie chart from report section', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Category breakdown',
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
                    { name: 'Entertainment', value: 20000 },
                  ],
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      const { container } = renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Category breakdown')).toBeInTheDocument();
      });

      // Verify chart container is rendered
      const chartContainer = container.querySelector('.h-80.w-full');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should render bar chart from report section', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Monthly comparison',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'bar',
                  title: 'Monthly Spending Trend',
                  data: [
                    { name: 'January', value: 1000000 },
                    { name: 'February', value: 1200000 },
                    { name: 'March', value: 1100000 },
                  ],
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      const { container } = renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Monthly comparison')).toBeInTheDocument();
      });

      // Verify chart container is rendered
      const chartContainer = container.querySelector('.h-80.w-full');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should render line chart from report section', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Trend analysis',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'line',
                  title: 'Spending Over Time',
                  data: [
                    { name: 'Week 1', value: 250000 },
                    { name: 'Week 2', value: 280000 },
                    { name: 'Week 3', value: 220000 },
                    { name: 'Week 4', value: 300000 },
                  ],
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      const { container } = renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Trend analysis')).toBeInTheDocument();
      });

      // Verify chart container is rendered
      const chartContainer = container.querySelector('.h-80.w-full');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Report Section Types', () => {
    it('should display card, alert, and suggestion sections correctly', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Mixed sections report',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Current Balance',
                  metric: '₩5,000,000',
                },
                {
                  type: 'alert',
                  title: 'Budget Warning',
                  subtitle: 'You have 2 days left in your budget',
                },
                {
                  type: 'suggestion',
                  title: 'Saving Opportunity',
                  subtitle: 'Reduce dining expenses by 10%',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      const { container } = renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Current Balance')).toBeInTheDocument();
        expect(screen.getByText('Budget Warning')).toBeInTheDocument();
        expect(screen.getByText('Saving Opportunity')).toBeInTheDocument();
      });

      // Verify styling for each section type
      const cards = container.querySelectorAll('.rounded-lg.border');
      const cardSection = Array.from(cards).find(card => card.textContent?.includes('Current Balance'));
      expect(cardSection).toHaveClass('bg-gray-50');

      const alertSection = Array.from(cards).find(card => card.textContent?.includes('Budget Warning'));
      expect(alertSection).toHaveClass('bg-yellow-50');

      const suggestionSection = Array.from(cards).find(card => card.textContent?.includes('Saving Opportunity'));
      expect(suggestionSection).toHaveClass('bg-blue-50');
    });

    it('should render alert icon for alert sections', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Alert report',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'alert',
                  title: 'Important Alert',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      const { container } = renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Important Alert')).toBeInTheDocument();
      });

      // Verify AlertCircle icon is rendered (yellow color)
      const alertIcon = container.querySelector('.text-yellow-500');
      expect(alertIcon).toBeInTheDocument();
    });

    it('should render lightbulb icon for suggestion sections', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Suggestion report',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'suggestion',
                  title: 'Money Saving Tip',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      const { container } = renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Money Saving Tip')).toBeInTheDocument();
      });

      // Verify Lightbulb icon is rendered (blue color)
      const bulbIcon = container.querySelector('.text-blue-500');
      expect(bulbIcon).toBeInTheDocument();
    });
  });

  describe('Missing Data & Error Handling', () => {
    it('should handle missing chart data gracefully', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Report without chart data',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'pie',
                  title: 'Empty Pie Chart',
                  data: [],
                },
                {
                  type: 'card',
                  title: 'Fallback Card',
                  metric: '₩100,000',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Report without chart data')).toBeInTheDocument();
      });

      // Empty chart should not render, but fallback card should
      expect(screen.getByText('Fallback Card')).toBeInTheDocument();
    });

    it('should display message without report when metadata is missing', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Simple message without report',
          metadata: undefined,
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Simple message without report')).toBeInTheDocument();
      });
    });

    it('should recover from report loading error', async () => {
      const user = userEvent.setup();
      // First load fails
      (api.getChatHistory as any).mockRejectedValueOnce(new Error('Failed to load'));
      // Then on retry (manual send), it succeeds
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'Recovery successful',
        metadata: {
          actionType: 'report',
          report: {
            sections: [
              {
                type: 'card',
                title: 'Report Data',
                metric: '₩500,000',
              },
            ],
          },
        },
      });

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load chat history/i)).toBeInTheDocument();
      });

      // User types a message to retry
      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'retry');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('Recovery successful')).toBeInTheDocument();
        expect(screen.getByText('Report Data')).toBeInTheDocument();
      });

      // Error message should be cleared
      expect(screen.queryByText(/failed to load chat history/i)).not.toBeInTheDocument();
    });

    it('should gracefully handle empty metrics', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Report with missing metric',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Card without Metric',
                  subtitle: 'This card has no metric value',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Card without Metric')).toBeInTheDocument();
        expect(screen.getByText('This card has no metric value')).toBeInTheDocument();
      });
    });
  });

  describe('Report Formatting & Consistency', () => {
    it('should maintain report formatting across re-renders', async () => {
      const user = userEvent.setup();
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Initial report',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Persistent Section',
                  metric: '₩2,000,000',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);
      (api.sendAIMessage as any).mockResolvedValue({
        success: true,
        content: 'New message',
        metadata: { actionType: 'report' },
      });

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('Persistent Section')).toBeInTheDocument();
      });

      // Get initial formatting
      const initialMetric = screen.getByText(/₩2,000,000/);
      expect(initialMetric).toBeInTheDocument();

      // Send new message
      const textarea = screen.getByPlaceholderText(/ask about your finances/i);
      await user.type(textarea, 'send new message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText('New message')).toBeInTheDocument();
      });

      // Original formatting should be maintained
      const persistentMetric = screen.getByText(/₩2,000,000/);
      expect(persistentMetric).toBeInTheDocument();
    });

    it('should display metrics with correct formatting (currency and percentage)', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Formatted metrics',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Income',
                  metric: '₩3,500,000',
                },
                {
                  type: 'card',
                  title: 'Growth Rate',
                  metric: '15%',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText(/₩3,500,000/)).toBeInTheDocument();
        expect(screen.getByText(/15%/)).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Messages with Reports', () => {
    it('should display multiple messages each with their own report sections', async () => {
      const mockMessages = [
        {
          id: 1,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'First report',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'First Month Total',
                  metric: '₩1,000,000',
                },
              ],
            },
          },
          createdAt: '2026-04-03T10:00:00Z',
        },
        {
          id: 2,
          userId: 'assistant',
          role: 'assistant' as const,
          content: 'Second report',
          metadata: {
            actionType: 'report',
            report: {
              sections: [
                {
                  type: 'card',
                  title: 'Second Month Total',
                  metric: '₩1,200,000',
                },
              ],
            },
          },
          createdAt: '2026-04-04T10:00:00Z',
        },
      ];

      (api.getChatHistory as any).mockResolvedValue(mockMessages);

      renderWithRouter(<AIPage />);

      await waitFor(() => {
        expect(screen.getByText('First report')).toBeInTheDocument();
        expect(screen.getByText('Second report')).toBeInTheDocument();
      });

      // Both sections should be present and distinct
      expect(screen.getByText('First Month Total')).toBeInTheDocument();
      expect(screen.getByText('Second Month Total')).toBeInTheDocument();
    });
  });
});
