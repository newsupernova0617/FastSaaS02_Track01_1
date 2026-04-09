// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'transaction.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TransactionImpl _$$TransactionImplFromJson(Map<String, dynamic> json) =>
    _$TransactionImpl(
      id: (json['id'] as num).toInt(),
      userId: json['userId'] as String,
      type: json['type'] as String,
      amount: _amountFromJson(json['amount']),
      category: json['category'] as String?,
      memo: json['memo'] as String?,
      date: json['date'] as String,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$$TransactionImplToJson(_$TransactionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'type': instance.type,
      'amount': instance.amount,
      'category': instance.category,
      'memo': instance.memo,
      'date': instance.date,
      'createdAt': instance.createdAt,
    };
