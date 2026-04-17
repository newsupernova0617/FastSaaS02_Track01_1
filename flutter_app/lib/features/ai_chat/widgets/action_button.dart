import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// ============================================================
// [채팅 위젯] action_button.dart
// AI 응답의 metadata에 actionType이 있을 때 표시되는 액션 버튼입니다.
//
// actionType에 따른 버튼:
//   'create', 'update', 'delete' → "View in Calendar" 버튼
//     (metadata.action.date가 있으면 해당 날짜로 이동)
//   'read', 'report' → "View Details" 버튼
//     (metadata.report.params.month가 있으면 해당 월 통계로 이동)
// ============================================================
class ActionButton extends StatelessWidget {
  final Map<String, dynamic>? metadata;

  const ActionButton({
    Key? key,
    required this.metadata,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (metadata == null) return const SizedBox.shrink();

    final actionType = metadata!['actionType'] as String?;
    if (actionType == null) return const SizedBox.shrink();

    // Determine if this is a calendar or stats action
    final isCalendarAction = ['create', 'update', 'delete'].contains(actionType);
    final isStatsAction = ['read', 'report'].contains(actionType);

    if (!isCalendarAction && !isStatsAction) {
      return const SizedBox.shrink();
    }

    final label = isCalendarAction ? 'View in Calendar' : 'View Details';
    final icon = isCalendarAction ? Icons.calendar_today : Icons.bar_chart;

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: ElevatedButton.icon(
        onPressed: () => _handleNavigate(context, isCalendarAction),
        icon: Icon(icon, size: 16),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
      ),
    );
  }

  void _handleNavigate(BuildContext context, bool isCalendarAction) {
    try {
      if (isCalendarAction) {
        final dateStr = _extractDate();
        if (dateStr != null) {
          context.go('/calendar?date=$dateStr');
        } else {
          context.go('/calendar');
        }
      } else {
        final monthStr = _extractMonth();
        if (monthStr != null) {
          context.go('/stats?month=$monthStr');
        } else {
          context.go('/stats');
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Navigation failed: $e')),
      );
    }
  }

  /// Extract date from metadata.action.date (YYYY-MM-DD format)
  String? _extractDate() {
    final action = metadata!['action'] as Map<String, dynamic>?;
    return action?['date'] as String?;
  }

  /// Extract month from metadata.report.params.month (YYYY-MM format)
  String? _extractMonth() {
    final report = metadata!['report'] as Map<String, dynamic>?;
    if (report == null) return null;

    final params = report['params'] as Map<String, dynamic>?;
    return params?['month'] as String?;
  }
}
