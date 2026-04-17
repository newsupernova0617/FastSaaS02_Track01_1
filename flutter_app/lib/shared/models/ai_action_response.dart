import 'package:freezed_annotation/freezed_annotation.dart';

part 'ai_action_response.freezed.dart';
part 'ai_action_response.g.dart';

// ============================================================
// [모델] ai_action_response.dart
// 레거시 AI 액션 API (/api/ai/action)의 응답 모델입니다.
//
// 필드:
//   success  — 요청 성공 여부
//   type     — AI가 수행한 액션 종류
//              'create'(거래생성) | 'read'(조회) | 'update'(수정)
//              'delete'(삭제) | 'report'(리포트생성)
//   result   — 액션 실행 결과 데이터
//   message  — 사용자에게 보여줄 메시지
//   content  — AI 응답 본문
//   metadata — 부가 정보 (리포트 데이터 등)
//   error    — 에러 메시지 (실패 시)
// ============================================================
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
