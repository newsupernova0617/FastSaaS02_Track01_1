import 'package:freezed_annotation/freezed_annotation.dart';

part 'transaction.freezed.dart';
part 'transaction.g.dart';

@freezed
class Transaction with _$Transaction {
  const factory Transaction({
    required int id,
    @JsonKey(name: 'user_id') required String userId,
    required String type, // 'income' | 'expense'
    required num amount,
    required String category,
    @JsonKey(name: 'memo') required String? description,
    required String date, // YYYY-MM-DD
    @JsonKey(name: 'created_at') required String createdAt,
  }) = _Transaction;

  factory Transaction.fromJson(Map<String, dynamic> json) =>
      _$TransactionFromJson(json);
}
