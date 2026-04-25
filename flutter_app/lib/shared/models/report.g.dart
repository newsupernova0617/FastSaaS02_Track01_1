// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'report.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ReportSummaryImpl _$$ReportSummaryImplFromJson(Map<String, dynamic> json) =>
    _$ReportSummaryImpl(
      id: (json['id'] as num).toInt(),
      reportType: json['reportType'] as String,
      title: json['title'] as String,
      subtitle: json['subtitle'] as String?,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$$ReportSummaryImplToJson(_$ReportSummaryImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reportType': instance.reportType,
      'title': instance.title,
      'subtitle': instance.subtitle,
      'createdAt': instance.createdAt,
    };

_$ReportBreakdownItemImpl _$$ReportBreakdownItemImplFromJson(
  Map<String, dynamic> json,
) => _$ReportBreakdownItemImpl(
  label: json['label'] as String,
  amount: json['amount'] as num,
  ratio: json['ratio'] as num,
);

Map<String, dynamic> _$$ReportBreakdownItemImplToJson(
  _$ReportBreakdownItemImpl instance,
) => <String, dynamic>{
  'label': instance.label,
  'amount': instance.amount,
  'ratio': instance.ratio,
};

_$ReportSummaryDataImpl _$$ReportSummaryDataImplFromJson(
  Map<String, dynamic> json,
) => _$ReportSummaryDataImpl(
  periodLabel: json['periodLabel'] as String,
  totalExpense: json['totalExpense'] as num,
  totalIncome: json['totalIncome'] as num,
  netAmount: json['netAmount'] as num,
  deltaPercent: json['deltaPercent'] as num?,
  insight: json['insight'] as String?,
  breakdown: (json['breakdown'] as List<dynamic>)
      .map((e) => ReportBreakdownItem.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$$ReportSummaryDataImplToJson(
  _$ReportSummaryDataImpl instance,
) => <String, dynamic>{
  'periodLabel': instance.periodLabel,
  'totalExpense': instance.totalExpense,
  'totalIncome': instance.totalIncome,
  'netAmount': instance.netAmount,
  'deltaPercent': instance.deltaPercent,
  'insight': instance.insight,
  'breakdown': instance.breakdown,
};

_$ReportDetailImpl _$$ReportDetailImplFromJson(Map<String, dynamic> json) =>
    _$ReportDetailImpl(
      id: (json['id'] as num).toInt(),
      reportType: json['reportType'] as String,
      title: json['title'] as String,
      subtitle: json['subtitle'] as String?,
      summary: json['summary'] == null
          ? null
          : ReportSummaryData.fromJson(json['summary'] as Map<String, dynamic>),
      reportData: (json['reportData'] as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList(),
      params: json['params'] as Map<String, dynamic>,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$$ReportDetailImplToJson(_$ReportDetailImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reportType': instance.reportType,
      'title': instance.title,
      'subtitle': instance.subtitle,
      'summary': instance.summary,
      'reportData': instance.reportData,
      'params': instance.params,
      'createdAt': instance.createdAt,
    };

_$ReportImpl _$$ReportImplFromJson(Map<String, dynamic> json) => _$ReportImpl(
  reportType: json['reportType'] as String,
  title: json['title'] as String,
  subtitle: json['subtitle'] as String?,
  summary: json['summary'] == null
      ? null
      : ReportSummaryData.fromJson(json['summary'] as Map<String, dynamic>),
  reportData: (json['reportData'] as List<dynamic>)
      .map((e) => e as Map<String, dynamic>)
      .toList(),
  params: json['params'] as Map<String, dynamic>,
);

Map<String, dynamic> _$$ReportImplToJson(_$ReportImpl instance) =>
    <String, dynamic>{
      'reportType': instance.reportType,
      'title': instance.title,
      'subtitle': instance.subtitle,
      'summary': instance.summary,
      'reportData': instance.reportData,
      'params': instance.params,
    };
