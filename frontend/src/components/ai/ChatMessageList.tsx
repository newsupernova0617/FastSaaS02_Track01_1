import { useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatBubble from './ChatBubble';
import type { ChatMessage } from '../../api';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export default function ChatMessageList({ messages, isLoading = false }: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-white p-4 space-y-4">
      {/* Welcome message when no messages */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <MessageCircle size={48} className="text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Start a conversation</h2>
          <p className="text-gray-500 mt-2">
            Ask me about your finances, spending patterns, or get smart recommendations.
          </p>
        </div>
      )}

      {/* Message bubbles */}
      {messages.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-2 items-center text-gray-500">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm">AI is thinking...</span>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={endRef} />
    </div>
  );
}
