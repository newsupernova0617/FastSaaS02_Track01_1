// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'transaction.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TransactionImpl _$$TransactionImplFromJson(Map<String, dynamic> json) =>
    _$TransactionImpl(
      id: (json['id'] as num).toInt(),
      userId: json['user_id'] as String,
      type: json['type'] as String,
      amount: json['amount'] as num,
      category: json['category'] as String,
      description: json['memo'] as String?,
      date: json['date'] as String,
      createdAt: json['created_at'] as String,
    );

Map<String, dynamic> _$$TransactionImplToJson(_$TransactionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'user_id': instance.userId,
      'type': instance.type,
      'amount': instance.amount,
      'category': instance.category,
      'memo': instance.description,
      'date': instance.date,
      'created_at': instance.createdAt,
    };
