import 'package:freezed_annotation/freezed_annotation.dart';

part 'ai_action_response.freezed.dart';
part 'ai_action_response.g.dart';

@freezed
class AIActionResponse with _$AIActionResponse {
  const factory AIActionResponse({
    required bool success,
    required String? type, // 'create' | 'update' | 'read' | 'delete' | 'report'
    required dynamic result,
    required String? message,
    required String? content,
    required Map<String, dynamic>? metadata,
    required String? error,
  }) = _AIActionResponse;

  factory AIActionResponse.fromJson(Map<String, dynamic> json) =>
      _$AIActionResponseFromJson(json);
}
