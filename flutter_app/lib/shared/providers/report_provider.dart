import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/report.dart';
import '../../core/api/api_client.dart';

// ============================================================
// [리포트 Provider] report_provider.dart
// AI가 생성한 리포트의 CRUD를 담당합니다.
// StatsPage(리포트 탭)과 ReportDetailPage에서 사용됩니다.
//
// getReportsProvider      — 리포트 목록 조회 (월별 필터 가능)
// getReportDetailProvider — 특정 리포트의 상세 데이터
// saveReportProvider      — 새 리포트 저장
// deleteReportProvider    — 리포트 삭제
// updateReportProvider    — 리포트 제목 수정
// ============================================================

// 리포트 목록 조회 (month: 필터, limit: 최대 개수)
final getReportsProvider = FutureProvider.family<List<ReportSummary>, ({String? month, int limit})>(
  (ref, params) async {
    final apiClient = ref.watch(apiClientProvider);
    return apiClient.getReports(
      month: params.month,
      limit: params.limit,
    );
  },
);

// Get single report detail
final getReportDetailProvider = FutureProvider.family<ReportDetail, int>(
  (ref, reportId) async {
    final apiClient = ref.watch(apiClientProvider);
    return apiClient.getReportDetail(reportId);
  },
);

// Save a new report
final saveReportProvider = FutureProvider.family<int, Report>(
  (ref, report) async {
    final apiClient = ref.watch(apiClientProvider);
    return apiClient.saveReport(
      reportType: report.reportType,
      title: report.title,
      subtitle: report.subtitle,
      reportData: report.reportData,
      params: report.params,
    );
  },
);

// Delete a report
final deleteReportProvider = FutureProvider.family<void, int>(
  (ref, reportId) async {
    final apiClient = ref.watch(apiClientProvider);
    return apiClient.deleteReport(reportId);
  },
);

// Update report title
final updateReportProvider = FutureProvider.family<void, (int, String)>(
  (ref, args) async {
    final (reportId, newTitle) = args;
    final apiClient = ref.watch(apiClientProvider);

    await apiClient.updateReport(reportId, newTitle);

    // Invalidate report detail cache so UI refreshes
    ref.invalidate(getReportDetailProvider(reportId));
    // Invalidate report list cache
    ref.invalidate(getReportsProvider((month: null, limit: 50)));
  },
);
