import 'package:freezed_annotation/freezed_annotation.dart';

part 'transaction.freezed.dart';
part 'transaction.g.dart';

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
