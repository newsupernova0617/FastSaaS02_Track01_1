import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionButton from '../../../src/components/ai/ActionButton';
import type { ChatMessageMetadata } from '../../../src/api';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('ActionButton Component', () => {
  // Test 1: Return null when metadata is undefined
  it('should return null when metadata is undefined', () => {
    const { container } = render(<ActionButton />);

    expect(container.firstChild).toBeNull();
  });

  // Test 2: Return null when metadata.actionType is undefined
  it('should return null when metadata.actionType is undefined', () => {
    const metadata: ChatMessageMetadata = {};

    const { container } = render(<ActionButton metadata={metadata} />);

    expect(container.firstChild).toBeNull();
  });

  // Test 3: Navigate to /calendar?date=YYYY-MM-DD when actionType is 'create'
  it('should navigate to calendar with date when actionType is "create"', async () => {
    const user = userEvent.setup();
    const metadata: ChatMessageMetadata = {
      actionType: 'create',
      action: {
        date: '2024-01-15',
      },
    };

    render(<ActionButton metadata={metadata} />);

    const button = screen.getByRole('button', { name: /View in Calendar/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/calendar?date=2024-01-15');
  });

  // Test 4: Navigate to /calendar?date=YYYY-MM-DD when actionType is 'update'
  it('should navigate to calendar when actionType is "update"', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();

    const metadata: ChatMessageMetadata = {
      actionType: 'update',
      action: {
        date: '2024-02-20',
      },
    };

    render(<ActionButton metadata={metadata} />);

    const button = screen.getByRole('button', { name: /View in Calendar/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/calendar?date=2024-02-20');
  });

  // Test 5: Navigate to /calendar?date=YYYY-MM-DD when actionType is 'delete'
  it('should navigate to calendar when actionType is "delete"', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();

    const metadata: ChatMessageMetadata = {
      actionType: 'delete',
      action: {
        date: '2024-03-10',
      },
    };

    render(<ActionButton metadata={metadata} />);

    const button = screen.getByRole('button', { name: /View in Calendar/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/calendar?date=2024-03-10');
  });

  // Test 6: Navigate to /stats?month=YYYY-MM when actionType is 'report' with month
  it('should navigate to stats with month when actionType is "report"', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();

    const metadata: ChatMessageMetadata = {
      actionType: 'report',
      report: {
        params: {
          month: '2024-01',
        },
      },
    };

    render(<ActionButton metadata={metadata} />);

    const button = screen.getByRole('button', { name: /View Details/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/stats?month=2024-01');
  });

  // Test 7: Use current month when actionType is 'report' but month is not provided
  it('should use current month when actionType is "report" without month', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();

    const metadata: ChatMessageMetadata = {
      actionType: 'report',
      report: {},
    };

    render(<ActionButton metadata={metadata} />);

    const button = screen.getByRole('button', { name: /View Details/i });
    await user.click(button);

    // Should navigate with current month (we can't test exact month, but we can verify format)
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/stats\?month=\d{4}-\d{2}/));
  });

  // Test 8: Navigate to /stats with current month when actionType is 'read'
  it('should navigate to stats with current month when actionType is "read"', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();

    const metadata: ChatMessageMetadata = {
      actionType: 'read',
    };

    render(<ActionButton metadata={metadata} />);

    const button = screen.getByRole('button', { name: /View Details/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/stats\?month=\d{4}-\d{2}/));
  });

  // Test 9: Show "View in Calendar" button for calendar actions
  it('should show "View in Calendar" button for calendar actions', () => {
    const metadata: ChatMessageMetadata = {
      actionType: 'create',
      action: {
        date: '2024-01-15',
      },
    };

    render(<ActionButton metadata={metadata} />);

    expect(screen.getByRole('button', { name: /View in Calendar/i })).toBeInTheDocument();
  });

  // Test 10: Show "View Details" button for stats actions
  it('should show "View Details" button for stats actions', () => {
    const metadata: ChatMessageMetadata = {
      actionType: 'report',
      report: {
        params: {
          month: '2024-01',
        },
      },
    };

    render(<ActionButton metadata={metadata} />);

    expect(screen.getByRole('button', { name: /View Details/i })).toBeInTheDocument();
  });

  // Test 11: Render button with correct styling
  it('should render button with correct styling classes', () => {
    const metadata: ChatMessageMetadata = {
      actionType: 'create',
      action: {
        date: '2024-01-15',
      },
    };

    const { container } = render(<ActionButton metadata={metadata} />);

    const button = container.querySelector('button');
    expect(button).toHaveClass('inline-flex', 'items-center', 'gap-2', 'rounded-lg', 'bg-blue-100', 'text-blue-700');
  });
});
