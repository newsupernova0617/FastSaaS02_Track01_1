import 'package:freezed_annotation/freezed_annotation.dart';

part 'summary_row.freezed.dart';
part 'summary_row.g.dart';

@freezed
class SummaryRow with _$SummaryRow {
  const factory SummaryRow({
    required String type, // 'income' | 'expense'
    required String category,
    required num total,
  }) = _SummaryRow;

  factory SummaryRow.fromJson(Map<String, dynamic> json) =>
      _$SummaryRowFromJson(json);
}
