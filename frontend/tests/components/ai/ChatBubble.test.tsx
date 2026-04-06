import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatBubble from '../../../src/components/ai/ChatBubble';
import type { ChatMessage } from '../../../src/api';

// Mock child components
vi.mock('../../../src/components/ai/ReportCard', () => ({
  default: ({ section }: { section: Record<string, unknown> }) => (
    <div data-testid="report-card">{section.title || 'Card'}</div>
  ),
}));

vi.mock('../../../src/components/ai/ReportChart', () => ({
  default: ({ section }: { section: Record<string, unknown> }) => (
    <div data-testid="report-chart">{section.type}</div>
  ),
}));

vi.mock('../../../src/components/ai/ActionButton', () => ({
  default: ({ metadata }: { metadata?: Record<string, unknown> }) => (
    <button data-testid="action-button">{metadata?.actionType || 'Action'}</button>
  ),
}));

describe('ChatBubble Component', () => {
  // Test 1: Render user message with blue background
  it('should render user message with blue background styling', () => {
    const userMessage: ChatMessage = {
      id: 1,
      userId: 'user123',
      role: 'user',
      content: 'Hello AI',
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(<ChatBubble message={userMessage} />);

    const messageDiv = screen.getByText('Hello AI').closest('div.max-w-2xl');
    expect(messageDiv).toHaveClass('bg-blue-500', 'text-white');
  });

  // Test 2: Render assistant message with gray background
  it('should render assistant message with gray background styling', () => {
    const assistantMessage: ChatMessage = {
      id: 2,
      userId: 'assistant',
      role: 'assistant',
      content: 'Hello user',
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(<ChatBubble message={assistantMessage} />);

    const messageDiv = screen.getByText('Hello user').closest('div.max-w-2xl');
    expect(messageDiv).toHaveClass('bg-gray-100', 'text-gray-900');
  });

  // Test 3: No metadata should not render ActionButton
  it('should not render ActionButton when metadata is undefined', () => {
    const message: ChatMessage = {
      id: 3,
      userId: 'assistant',
      role: 'assistant',
      content: 'No action here',
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(<ChatBubble message={message} />);

    expect(screen.queryByTestId('action-button')).not.toBeInTheDocument();
  });

  // Test 4: Metadata with actionType should render ActionButton
  it('should render ActionButton when metadata with actionType is present', () => {
    const message: ChatMessage = {
      id: 4,
      userId: 'assistant',
      role: 'assistant',
      content: 'Here is your report',
      metadata: {
        actionType: 'report',
        report: {},
      },
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(<ChatBubble message={message} />);

    expect(screen.getByTestId('action-button')).toBeInTheDocument();
  });

  // Test 5: reportSections array should render ReportCard and ReportChart
  it('should render ReportCard and ReportChart components from reportSections', () => {
    const message: ChatMessage = {
      id: 5,
      userId: 'assistant',
      role: 'assistant',
      content: 'Here is your report with data',
      metadata: {
        actionType: 'report',
        report: {
          sections: [
            {
              type: 'card',
              title: 'Spending Summary',
              metric: '₩1,000,000',
            },
            {
              type: 'pie',
              title: 'Category Breakdown',
              data: [{ name: 'Food', value: 500 }],
            },
          ],
        },
      },
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(<ChatBubble message={message} />);

    expect(screen.getByTestId('report-card')).toBeInTheDocument();
    expect(screen.getByTestId('report-chart')).toBeInTheDocument();
  });

  // Test 6: Preserve whitespace with whitespace-pre-wrap
  it('should preserve whitespace and newlines with whitespace-pre-wrap', () => {
    const messageWithNewlines: ChatMessage = {
      id: 6,
      userId: 'assistant',
      role: 'assistant',
      content: 'Line 1\n  Line 2 with indent\nLine 3',
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(<ChatBubble message={messageWithNewlines} />);

    const contentElement = screen.getByText(/Line 1/);
    expect(contentElement).toHaveClass('whitespace-pre-wrap');
  });
});
