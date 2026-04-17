import 'package:freezed_annotation/freezed_annotation.dart';

part 'summary_row.freezed.dart';
part 'summary_row.g.dart';

// ============================================================
// [모델] summary_row.dart
// 월별 카테고리별 거래 합계 데이터 모델입니다.
// StatsPage의 파이차트와 카테고리 상세 표시에 사용됩니다.
//
// 필드:
//   type     — 'income'(수입) 또는 'expense'(지출)
//   category — 카테고리명 (식비, 교통 등)
//   total    — 해당 카테고리의 총 금액
// ============================================================
@freezed
class SummaryRow with _$SummaryRow {
  const factory SummaryRow({
    required String type, // 'income' | 'expense'
    required String category,
    @JsonKey(fromJson: _totalFromJson) required num total,
  }) = _SummaryRow;

  factory SummaryRow.fromJson(Map<String, dynamic> json) =>
      _$SummaryRowFromJson(json);
}

// Helper to safely convert total from JSON
num _totalFromJson(dynamic json) {
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
