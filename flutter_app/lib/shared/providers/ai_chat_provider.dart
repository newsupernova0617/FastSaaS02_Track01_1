import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/shared/models/chat_message.dart';
import 'api_provider.dart';

/// Provider for fetching chat history
/// Returns: List<ChatMessage>
final getChatHistoryProvider = FutureProvider<List<ChatMessage>>((ref) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Fetch chat history with limit
    final messages = await apiClient.getChatHistory(limit: 50);

    return messages;
  } catch (e) {
    print('Error fetching chat history: $e');
    rethrow;
  }
});

/// Provider for sending an AI message
/// Parameters:
///   - text: String message to send to the AI
/// Returns: ChatMessage (the assistant's response)
final sendAIMessageProvider =
    FutureProvider.family<ChatMessage, String>((ref, text) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Send message and get response
    final response = await apiClient.sendAIMessage(text);

    // Create a ChatMessage from the response
    // Use content or message field from the response
    final assistantMessage = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch,
      userId: '', // Will be filled by backend
      role: 'assistant',
      content: response.content ?? response.message ?? 'Response received',
      metadata: response.metadata,
      createdAt: DateTime.now().toIso8601String(),
    );

    // Invalidate chat history to refresh
    ref.invalidate(getChatHistoryProvider);

    return assistantMessage;
  } catch (e) {
    print('Error sending AI message: $e');
    rethrow;
  }
});

/// Provider for clearing chat history
/// Returns: int (number of deleted messages)
final clearChatHistoryProvider = FutureProvider<int>((ref) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Clear chat history
    final deletedCount = await apiClient.clearChatHistory();

    // Invalidate chat history
    ref.invalidate(getChatHistoryProvider);

    return deletedCount;
  } catch (e) {
    print('Error clearing chat history: $e');
    rethrow;
  }
});
