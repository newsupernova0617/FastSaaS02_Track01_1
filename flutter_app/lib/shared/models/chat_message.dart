import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_message.freezed.dart';
part 'chat_message.g.dart';

@freezed
class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required int id,
    @JsonKey(name: 'user_id') required String userId,
    required String role, // 'user' | 'assistant'
    required String content,
    @JsonKey(name: 'metadata') required Map<String, dynamic>? metadata,
    @JsonKey(name: 'created_at') required String createdAt,
  }) = _ChatMessage;

  factory ChatMessage.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageFromJson(json);
}
