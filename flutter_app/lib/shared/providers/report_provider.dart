import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/report.dart';
import '../models/report_type.dart';
import '../../core/api/api_client.dart';

// Get list of reports with optional month filter
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
      reportType: ReportType.fromString(report.reportType) ?? ReportType.monthly_summary,
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
