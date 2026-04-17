import 'package:freezed_annotation/freezed_annotation.dart';

part 'transaction.freezed.dart';
part 'transaction.g.dart';

// ============================================================
// [모델] transaction.dart
// 수입/지출 거래 데이터 모델입니다.
// freezed 패키지로 불변(immutable) 클래스를 자동 생성합니다.
//
// 필드:
//   id        — 거래 고유 ID
//   userId    — 사용자 ID (백엔드에서 JWT로 검증)
//   type      — 'income'(수입) 또는 'expense'(지출)
//   amount    — 금액
//   category  — 카테고리 (식비, 교통, 월급 등)
//   memo      — 메모 (선택사항)
//   date      — 거래 날짜 (YYYY-MM-DD)
//   createdAt — 생성 시각
// ============================================================
@freezed
class Transaction with _$Transaction {
  const factory Transaction({
    required int id,
    @JsonKey(name: 'userId') required String userId,
    required String type, // 'income' | 'expense'
    @JsonKey(fromJson: _amountFromJson) required num amount,
    String? category,
    @JsonKey(name: 'memo') String? memo,
    required String date, // YYYY-MM-DD
    @JsonKey(name: 'createdAt') required String createdAt,
  }) = _Transaction;

  factory Transaction.fromJson(Map<String, dynamic> json) =>
      _$TransactionFromJson(json);
}

// Helper to safely convert amount from JSON
num _amountFromJson(dynamic json) {
  if (json == null) return 0;
  if (json is num) return json;
  if (json is String) {
    try {
      return num.parse(json);
    } catch (e) {
      return 0;
    }
  }
  return 0;
}
