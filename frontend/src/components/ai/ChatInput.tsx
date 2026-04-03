import { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ChatInput({ onSend, isLoading = false }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;

    const message = text.trim();
    setText('');

    try {
      await onSend(message);
    } catch (err) {
      console.error('Failed to send message:', err);
      setText(message); // Restore text on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 p-4 bg-white border-t">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your finances... (Enter to send, Shift+Enter for new line)"
        disabled={isLoading}
        className="flex-1 resize-none rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        rows={3}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || isLoading}
        className="self-end rounded-lg bg-blue-500 p-3 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        aria-label="Send message"
      >
        <Send size={20} />
      </button>
    </div>
  );
}
