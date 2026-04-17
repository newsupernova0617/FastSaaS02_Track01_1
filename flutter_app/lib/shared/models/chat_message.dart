import 'package:freezed_annotation/freezed_annotation.dart';
import 'dart:convert';

part 'chat_message.freezed.dart';
part 'chat_message.g.dart';

// ============================================================
// [모델] chat_message.dart
// 채팅 메시지 데이터 모델입니다.
//
// 필드:
//   id        — 메시지 고유 ID
//   sessionId — 소속 세션 ID (세션 기반 채팅에서 사용)
//   userId    — 작성자 ID
//   role      — 'user'(사용자) 또는 'assistant'(AI)
//   content   — 메시지 본문 텍스트
//   metadata  — 부가 정보 (actionType, report 데이터 등)
//              → AI 응답에 포함되어 액션 버튼이나 리포트 차트 렌더링에 사용
//   createdAt — 생성 시각 (ISO 8601 문자열)
// ============================================================
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
