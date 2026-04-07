import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/api/api_client.dart';
import 'package:flutter_app/shared/models/chat_message.dart';

/// Fetch chat messages for a specific session
final chatMessagesProvider =
    FutureProvider.family<List<ChatMessage>, int>((ref, sessionId) async {
  final apiClient = ref.watch(apiClientProvider);

  try {
    final messages = await apiClient.getSessionMessages(sessionId);

    // Sort by creation time (oldest first for chat display)
    messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return messages;
  } catch (e) {
    throw Exception('Error loading messages: $e');
  }
});

/// Send a chat message and get AI response
final sendChatMessageProvider =
    FutureProvider.family<void, (String, int)>((ref, args) async {
  final apiClient = ref.watch(apiClientProvider);
  final (text, sessionId) = args;

  try {
    await apiClient.sendSessionMessage(sessionId, text);

    // Invalidate chat messages to fetch fresh data
    ref.invalidate(chatMessagesProvider(sessionId));
  } catch (e) {
    throw Exception('Error sending message: $e');
  }
});
