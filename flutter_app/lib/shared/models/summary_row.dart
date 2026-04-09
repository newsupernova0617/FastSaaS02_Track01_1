import 'package:freezed_annotation/freezed_annotation.dart';

part 'summary_row.freezed.dart';
part 'summary_row.g.dart';

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
