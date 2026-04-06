import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from '../../../src/components/ai/ChatInput';

describe('ChatInput Component', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  // Test 1: Rendering & Basic State - Render textarea and send button
  it('should render textarea and send button', () => {
    render(<ChatInput onSend={mockOnSend} />);

    expect(
      screen.getByPlaceholderText(/Ask about your finances/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });

  // Test 2: Rendering & Basic State - Update textarea on input change
  it('should update textarea on input change', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(
      /Ask about your finances/i
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'Test message');

    expect(textarea.value).toBe('Test message');
  });

  // Test 3: Keyboard Events - Call onSend when Enter key pressed
  it('should call onSend when Enter key pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(
      /Ask about your finances/i
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'Hello');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith('Hello');
      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });
  });

  // Test 4: Keyboard Events - NOT call onSend when Shift+Enter pressed
  it('should NOT call onSend when Shift+Enter pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(
      /Ask about your finances/i
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'Hello');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    // Should not call onSend
    expect(mockOnSend).not.toHaveBeenCalled();
    // Should contain both the text and a newline
    expect(textarea.value).toContain('Hello');
  });

  // Test 5: Send & Cleanup - Clear input after sending
  it('should clear input after sending', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(
      /Ask about your finances/i
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  // Test 6: Send & Cleanup - Restore text on send error
  it('should restore text on send error', async () => {
    const user = userEvent.setup();
    mockOnSend.mockRejectedValue(new Error('API Error'));

    render(<ChatInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(
      /Ask about your finances/i
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'Error test');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(textarea.value).toBe('Error test');
    });
  });

  // Test 7: Loading State - Disable button when isLoading=true
  it('should disable button when isLoading=true', () => {
    render(<ChatInput onSend={mockOnSend} isLoading={true} />);

    const button = screen.getByLabelText('Send message') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  // Test 8: Loading State - Disable textarea when isLoading=true
  it('should disable textarea when isLoading=true', () => {
    render(<ChatInput onSend={mockOnSend} isLoading={true} />);

    const textarea = screen.getByPlaceholderText(
      /Ask about your finances/i
    ) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  // Bonus Test 9: Button should be disabled when textarea is empty
  it('should disable button when textarea is empty', () => {
    render(<ChatInput onSend={mockOnSend} />);

    const button = screen.getByLabelText('Send message') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  // Bonus Test 10: Button should be enabled when textarea has text
  it('should enable button when textarea has text', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(
      /Ask about your finances/i
    ) as HTMLTextAreaElement;
    const button = screen.getByLabelText('Send message') as HTMLButtonElement;

    await user.type(textarea, 'Test');

    expect(button.disabled).toBe(false);
  });
});
