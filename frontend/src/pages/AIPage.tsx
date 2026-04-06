import { useEffect, useState } from 'react';
import ChatMessageList from '../components/ai/ChatMessageList';
import ChatInput from '../components/ai/ChatInput';
import { sendAIMessage, getChatHistory } from '../api';
import type { ChatMessage } from '../api';

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getChatHistory(100); // Load last 100 messages
        setMessages(history);
      } catch (err) {
        console.error('Failed to load chat history:', err);
        setError('Failed to load chat history');
      }
    };

    loadHistory();
  }, []);

  // Handle sending message
  const handleSendMessage = async (text: string) => {
    setError(null);

    // Optimistic UI: add user message immediately
    const optimisticUserMessage: ChatMessage = {
      id: Math.floor(Math.random() * 1000000), // Temporary ID
      userId: 'current',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setIsLoading(true);

    try {
      // Send message to AI
      const response = await sendAIMessage(text);

      if (!response.success) {
<<<<<<< HEAD
        throw new Error(response.error || 'Failed to get AI response');
=======
        throw new Error('Failed to get AI response');
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: Math.floor(Math.random() * 1000000), // Temporary ID (will be overwritten by server)
        userId: 'current',
        role: 'assistant',
<<<<<<< HEAD
        content: response.content || response.message || '응답을 생성하지 못했습니다.',
=======
        content: response.content,
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
        metadata: response.metadata,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);

      // Remove optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">AI Financial Assistant</h1>
        <p className="text-sm text-gray-500">Ask about your finances and get insights</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Message list */}
      <ChatMessageList messages={messages} isLoading={isLoading} />

      {/* Input area */}
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
