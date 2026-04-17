import 'package:freezed_annotation/freezed_annotation.dart';

part 'report.freezed.dart';
part 'report.g.dart';

// ============================================================
// [모델] report.dart
// AI가 생성한 리포트 데이터 모델입니다. 3개 클래스로 구성:
//
// ReportSummary — 리포트 목록 표시용 (id, 제목, 유형, 생성일)
// ReportDetail  — 리포트 상세 (reportData에 차트/카드 섹션 배열 포함)
// Report        — 리포트 저장 요청용 (id 없음, 새로 저장할 때 사용)
//
// reportData 구조 예시:
//   [{ type: 'pie', title: '지출 비율', data: {labels: [...], values: [...]} },
//    { type: 'card', title: '총 지출', metric: '500,000원' }]
// ============================================================
@freezed
class ReportSummary with _$ReportSummary {
  const factory ReportSummary({
    required int id,
    required String reportType,
    required String title,
    String? subtitle,
    required String createdAt,
  }) = _ReportSummary;

  factory ReportSummary.fromJson(Map<String, dynamic> json) =>
      _$ReportSummaryFromJson(json);
}

@freezed
class ReportDetail with _$ReportDetail {
  const factory ReportDetail({
    required int id,
    required String reportType,
    required String title,
    String? subtitle,
    required List<Map<String, dynamic>> reportData,
    required Map<String, dynamic> params,
    required String createdAt,
  }) = _ReportDetail;

  factory ReportDetail.fromJson(Map<String, dynamic> json) =>
      _$ReportDetailFromJson(json);
}

@freezed
class Report with _$Report {
  const factory Report({
    required String reportType,
    required String title,
    String? subtitle,
    required List<Map<String, dynamic>> reportData,
    required Map<String, dynamic> params,
  }) = _Report;

  factory Report.fromJson(Map<String, dynamic> json) =>
      _$ReportFromJson(json);
}
