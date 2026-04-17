import 'package:flutter/material.dart';

// ============================================================
// [리포트 위젯] report_card.dart
// AI 응답 또는 리포트 상세에서 카드형 섹션을 렌더링합니다.
//
// 섹션 타입별 표시:
//   'card'       → 메트릭 카드 (제목, 수치, 추세 아이콘)
//   'alert'      → 경고 카드 (주황색, 경고 아이콘)
//   'suggestion' → 제안 카드 (파란색, 전구 아이콘)
// ============================================================
class ReportCard extends StatelessWidget {
  final Map<String, dynamic> section;

  const ReportCard({
    Key? key,
    required this.section,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final sectionType = section['type'] as String? ?? 'card';
    final title = section['title'] as String?;
    final subtitle = section['subtitle'] as String?;
    final metric = section['metric'] as String?;
    final trend = section['trend'] as String?;
    final dataMap = section['data'] as Map<String, dynamic>?;
    final message = dataMap?['message'] as String?;

    switch (sectionType) {
      case 'card':
        return _buildCardSection(context, title, subtitle, metric, trend);
      case 'alert':
        return _buildAlertSection(context, title, message);
      case 'suggestion':
        return _buildSuggestionSection(context, title, message);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildCardSection(BuildContext context, String? title, String? subtitle, String? metric, String? trend) {
    // Determine trend icon and color
    IconData? trendIcon;
    Color trendColor = Colors.grey;
    if (trend != null) {
      switch (trend.toLowerCase()) {
        case 'up':
          trendIcon = Icons.trending_up;
          trendColor = Colors.green;
          break;
        case 'down':
          trendIcon = Icons.trending_down;
          trendColor = Colors.red;
          break;
        case 'stable':
          trendIcon = Icons.trending_flat;
          trendColor = Colors.orange;
          break;
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(
          left: BorderSide(color: Colors.grey[300]!, width: 4),
        ),
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(8),
          bottomRight: Radius.circular(8),
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title row with trend icon
          Row(
            children: [
              Expanded(
                child: Text(
                  title ?? 'Metric',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[700],
                      ),
                ),
              ),
              if (trendIcon != null) ...[
                const SizedBox(width: 8),
                Icon(trendIcon, size: 20, color: trendColor),
              ],
            ],
          ),
          // Subtitle if present
          if (subtitle != null && subtitle.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
          // Large metric value
          const SizedBox(height: 12),
          Text(
            metric ?? '—',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertSection(BuildContext context, String? title, String? message) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.orange[50],
        border: Border(
          left: BorderSide(color: Colors.orange[300]!, width: 4),
        ),
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(8),
          bottomRight: Radius.circular(8),
        ),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_rounded, size: 20, color: Colors.orange[700]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Colors.orange[900],
                        ),
                  ),
                if (message != null) ...[
                  if (title != null) const SizedBox(height: 4),
                  Text(
                    message,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.orange[800],
                        ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestionSection(BuildContext context, String? title, String? message) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.blue[50],
        border: Border(
          left: BorderSide(color: Colors.blue[300]!, width: 4),
        ),
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(8),
          bottomRight: Radius.circular(8),
        ),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.lightbulb_rounded, size: 20, color: Colors.blue[700]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Colors.blue[900],
                        ),
                  ),
                if (message != null) ...[
                  if (title != null) const SizedBox(height: 4),
                  Text(
                    message,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.blue[800],
                        ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
