import 'package:freezed_annotation/freezed_annotation.dart';
import 'dart:convert';

part 'chat_message.freezed.dart';
part 'chat_message.g.dart';

@freezed
class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required int id,
    @JsonKey(name: 'sessionId') int? sessionId,
    @JsonKey(name: 'userId') String? userId,
    required String role, // 'user' | 'assistant'
    required String content,
    @JsonKey(fromJson: _metadataFromJson, toJson: _metadataToJson)
    Map<String, dynamic>? metadata,
    @JsonKey(name: 'createdAt') required String createdAt,
  }) = _ChatMessage;

  factory ChatMessage.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageFromJson(json);
}

// Helper function to parse metadata from JSON string or map
Map<String, dynamic>? _metadataFromJson(dynamic json) {
  if (json == null) return null;
  if (json is String) {
    try {
      return jsonDecode(json) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }
  if (json is Map<String, dynamic>) return json;
  return null;
}

// Helper function to serialize metadata to JSON
dynamic _metadataToJson(Map<String, dynamic>? metadata) {
  return metadata;
}
