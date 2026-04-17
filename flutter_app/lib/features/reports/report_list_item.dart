import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/models/report.dart';

// ============================================================
// [리포트 위젯] report_list_item.dart
// 통계 탭의 리포트 목록에서 각 리포트를 한 줄로 표시하는 위젯입니다.
// 제목, 부제목, 리포트 유형 칩, 생성일을 표시합니다.
// 탭하면 /report/:id 경로로 ReportDetailPage를 엽니다.
// ============================================================
class ReportListItem extends StatelessWidget {
  final ReportSummary report;

  const ReportListItem({
    Key? key,
    required this.report,
  }) : super(key: key);

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (e) {
      return isoDate;
    }
  }

  String _getReportTypeLabel(String reportType) {
    final labels = {
      'monthly_summary': '월간 요약',
      'category_detail': '카테고리 분석',
      'spending_pattern': '지출 패턴',
      'anomaly': '이상 탐지',
      'suggestion': '제안',
    };
    return labels[reportType] ?? reportType;
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(report.title),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (report.subtitle != null && report.subtitle!.isNotEmpty)
            Text(report.subtitle!),
          SizedBox(height: 4),
          Row(
            children: [
              Chip(
                label: Text(
                  _getReportTypeLabel(report.reportType),
                  style: const TextStyle(fontSize: 12),
                ),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              const SizedBox(width: 8),
              Text(
                _formatDate(report.createdAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        context.push('/report/${report.id}', extra: {'isFromStats': true});
      },
    );
  }
}
