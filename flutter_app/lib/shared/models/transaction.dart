import 'package:freezed_annotation/freezed_annotation.dart';

part 'transaction.freezed.dart';
part 'transaction.g.dart';

@freezed
class Transaction with _$Transaction {
  const factory Transaction({
    required int id,
    @JsonKey(name: 'userId') required String userId,
    required String type, // 'income' | 'expense'
    required num amount,
    String? category,
    @JsonKey(name: 'memo') String? memo,
    required String date, // YYYY-MM-DD
    @JsonKey(name: 'createdAt') required String createdAt,
  }) = _Transaction;

  factory Transaction.fromJson(Map<String, dynamic> json) =>
      _$TransactionFromJson(json);
}
