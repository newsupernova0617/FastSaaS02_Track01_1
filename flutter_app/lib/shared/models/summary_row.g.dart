// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'summary_row.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$SummaryRowImpl _$$SummaryRowImplFromJson(Map<String, dynamic> json) =>
    _$SummaryRowImpl(
      type: json['type'] as String,
      category: json['category'] as String,
      total: _totalFromJson(json['total']),
    );

Map<String, dynamic> _$$SummaryRowImplToJson(_$SummaryRowImpl instance) =>
    <String, dynamic>{
      'type': instance.type,
      'category': instance.category,
      'total': instance.total,
    };
