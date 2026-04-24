import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:flutter_app/shared/providers/report_provider.dart';

final ensureAutoReportsProvider = FutureProvider<void>((ref) async {
  final now = DateTime.now();

  // Test mode: generate due reports on app entry today. The backend returns an
  // existing report for the same period, so this remains idempotent.
  if (_isWeeklyReportDue(now)) {
    final weekStart = _startOfWeek(now);
    final weekEnd = weekStart.add(const Duration(days: 6));
    await ref.read(
      generateScheduledReportProvider((
        period: 'weekly',
        month: null,
        weekStart: _formatDate(weekStart),
        weekEnd: _formatDate(weekEnd),
      )).future,
    );
  }

  if (_isMonthlyReportDue(now)) {
    final month = DateFormat('yyyy-MM').format(now);
    await ref.read(
      generateScheduledReportProvider((
        period: 'monthly',
        month: month,
        weekStart: null,
        weekEnd: null,
      )).future,
    );
  }
});

bool _isWeeklyReportDue(DateTime date) {
  // TODO: after testing, restore to: date.weekday == DateTime.sunday.
  return true;
}

bool _isMonthlyReportDue(DateTime date) {
  // TODO: after testing, restore to the last-day-of-month check below.
  return true;
}

// ignore: unused_element
bool _isLastDayOfMonth(DateTime date) {
  final tomorrow = date.add(const Duration(days: 1));
  return tomorrow.month != date.month;
}

DateTime _startOfWeek(DateTime date) {
  return DateTime(
    date.year,
    date.month,
    date.day,
  ).subtract(Duration(days: date.weekday - DateTime.monday));
}

String _formatDate(DateTime date) => DateFormat('yyyy-MM-dd').format(date);
