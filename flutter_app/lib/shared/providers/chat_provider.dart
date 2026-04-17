import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/api/api_client.dart';
import 'package:flutter_app/shared/models/chat_message.dart';

// ============================================================
// [채팅 Provider] chat_provider.dart
// 세션 기반 채팅의 메시지 조회/전송을 담당합니다.
// ChatScreen(채팅 화면)에서 사용됩니다.
//
// chatMessagesProvider(sessionId) — 특정 세션의 메시지 목록 조회
// sendChatMessageProvider((text, sessionId)) — 메시지 전송 후 목록 새로고침
// ============================================================

// 특정 세션의 채팅 메시지를 서버에서 가져오는 provider
// .family: sessionId를 파라미터로 받아 세션별로 다른 데이터를 캐시
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
