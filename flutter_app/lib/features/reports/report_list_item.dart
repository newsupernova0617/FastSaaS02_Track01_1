import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/models/report.dart';
import '../../shared/models/report_type.dart';

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
    return ReportType.fromString(reportType)?.label ?? reportType;
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
