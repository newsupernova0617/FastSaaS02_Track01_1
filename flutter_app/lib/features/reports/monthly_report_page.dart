import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/features/reports/report_list_item.dart';
import 'package:flutter_app/shared/providers/report_provider.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';

class MonthlyReportPage extends ConsumerStatefulWidget {
  const MonthlyReportPage({super.key});

  @override
  ConsumerState<MonthlyReportPage> createState() => _MonthlyReportPageState();
}

class _MonthlyReportPageState extends ConsumerState<MonthlyReportPage> {
  late DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  String? _generatingPeriod;

  String get _monthKey => DateFormat('yyyy-MM').format(_month);

  Future<void> _pickMonth() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _month,
      firstDate: DateTime(2020),
      lastDate: DateTime(DateTime.now().year + 1, 12, 31),
      initialDatePickerMode: DatePickerMode.year,
    );
    if (picked != null) {
      setState(() => _month = DateTime(picked.year, picked.month));
    }
  }

  Future<void> _generateMonthlyReport() async {
    setState(() => _generatingPeriod = 'monthly');
    try {
      final reportId = await ref.read(
        generateScheduledReportProvider((
          period: 'monthly',
          month: _monthKey,
          weekStart: null,
          weekEnd: null,
        )).future,
      );
      if (!mounted) return;
      context.push('/report/$reportId', extra: {'isFromStats': true});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('월별 리포트 생성 실패: $e')));
    } finally {
      if (mounted) setState(() => _generatingPeriod = null);
    }
  }

  Future<void> _generateWeeklyReport() async {
    setState(() => _generatingPeriod = 'weekly');
    try {
      final now = DateTime.now();
      final weekStart = DateTime(
        now.year,
        now.month,
        now.day,
      ).subtract(Duration(days: now.weekday - DateTime.monday));
      final weekEnd = weekStart.add(const Duration(days: 6));
      final reportId = await ref.read(
        generateScheduledReportProvider((
          period: 'weekly',
          month: null,
          weekStart: DateFormat('yyyy-MM-dd').format(weekStart),
          weekEnd: DateFormat('yyyy-MM-dd').format(weekEnd),
        )).future,
      );
      if (!mounted) return;
      context.push('/report/$reportId', extra: {'isFromStats': true});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('주간 리포트 생성 실패: $e')));
    } finally {
      if (mounted) setState(() => _generatingPeriod = null);
    }
  }

  void _moveMonth(int delta) {
    setState(() {
      _month = DateTime(_month.year, _month.month + delta);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reports = ref.watch(
      getReportsProvider((month: _monthKey, limit: 50)),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('정기 리포트'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/home'),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(getReportsProvider((month: _monthKey, limit: 50))),
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              GlassCard(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('리포트 기준', style: theme.textTheme.titleSmall),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            DateFormat('yyyy년 M월').format(_month),
                            style: theme.textTheme.headlineSmall,
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: _pickMonth,
                          icon: const Icon(Icons.calendar_month_rounded),
                          label: const Text('변경'),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        SizedBox(
                          width: 150,
                          child: OutlinedButton.icon(
                            onPressed: () => _moveMonth(-1),
                            icon: const Icon(Icons.chevron_left_rounded),
                            label: const Text('이전 달'),
                          ),
                        ),
                        SizedBox(
                          width: 150,
                          child: OutlinedButton.icon(
                            onPressed: () => _moveMonth(1),
                            icon: const Icon(Icons.chevron_right_rounded),
                            label: const Text('다음 달'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        SizedBox(
                          width: 150,
                          child: ElevatedButton.icon(
                            onPressed: _generatingPeriod == null
                                ? _generateWeeklyReport
                                : null,
                            icon: _generatingPeriod == 'weekly'
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.calendar_view_week_rounded),
                            label: Text(
                              _generatingPeriod == 'weekly'
                                  ? '생성 중...'
                                  : '주간 생성',
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 150,
                          child: ElevatedButton.icon(
                            onPressed: _generatingPeriod == null
                                ? _generateMonthlyReport
                                : null,
                            icon: _generatingPeriod == 'monthly'
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.calendar_month_rounded),
                            label: Text(
                              _generatingPeriod == 'monthly'
                                  ? '생성 중...'
                                  : '월간 생성',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('저장된 리포트', style: theme.textTheme.titleSmall),
              const SizedBox(height: AppSpacing.md),
              reports.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => GlassCard(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Text('리포트를 불러오지 못했습니다: $err'),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return GlassCard(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Text(
                        '이 월에 저장된 리포트가 없습니다. 새 리포트를 생성해 보세요.',
                        style: theme.textTheme.bodyMedium,
                      ),
                    );
                  }
                  return Column(
                    children: [
                      for (final report in items)
                        Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: ReportListItem(report: report),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
