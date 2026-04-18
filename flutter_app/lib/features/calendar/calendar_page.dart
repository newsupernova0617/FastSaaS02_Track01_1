import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/providers/transaction_provider.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/widgets/ad_banner.dart';
import 'package:flutter_app/shared/widgets/animated_fade_slide.dart';
import 'package:flutter_app/shared/widgets/empty_state.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';
import 'package:flutter_app/shared/widgets/skeleton.dart';
import 'package:flutter_app/shared/widgets/transaction_tile.dart';

// ============================================================
// [달력 화면] calendar_page.dart
// 월별 달력 + 선택 날짜의 거래 목록.
// ============================================================
class CalendarPage extends ConsumerStatefulWidget {
  const CalendarPage({super.key});

  @override
  ConsumerState<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends ConsumerState<CalendarPage> {
  late DateTime _selectedDate;
  late DateTime _focusedDate;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
    _focusedDate = DateTime.now();

    Future.microtask(() {
      if (!mounted) return;
      final dateStr = GoRouterState.of(context).uri.queryParameters['date'];
      if (dateStr != null) {
        try {
          final date = DateTime.parse(dateStr);
          setState(() {
            _selectedDate = date;
            _focusedDate = date;
          });
        } catch (_) {/* ignore */}
      }
    });
  }

  String _fmt(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  String _formatCurrency(num value) =>
      '₩${value.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]},',
      )}';

  Map<String, double> _dailyTotals(List<Transaction> txs, DateTime date) {
    final s = _fmt(date);
    double e = 0, i = 0;
    for (final t in txs) {
      if (t.date != s) continue;
      if (t.type == 'expense') e += t.amount.toDouble();
      if (t.type == 'income') i += t.amount.toDouble();
    }
    return {'expense': e, 'income': i};
  }

  List<Transaction> _monthTxs(List<Transaction> txs) {
    final m = '${_focusedDate.year}-${_focusedDate.month.toString().padLeft(2, '0')}';
    return txs.where((t) => t.date.startsWith(m)).toList();
  }

  List<Color> _indicators(DateTime day, List<Transaction> monthTxs) {
    final s = _fmt(day);
    final out = <Color>[];
    if (monthTxs.any((t) => t.date == s && t.type == 'expense')) {
      out.add(AppColors.expense);
    }
    if (monthTxs.any((t) => t.date == s && t.type == 'income')) {
      out.add(AppColors.income);
    }
    return out;
  }

  Future<void> _deleteTransaction(String transactionId) async {
    final theme = Theme.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('거래 삭제'),
        content: const Text('이 거래를 삭제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              '삭제',
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ref.read(deleteTransactionProvider(transactionId).future);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('거래가 삭제되었습니다.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('삭제 실패: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final txsAsync = ref.watch(transactionsProvider(null));

    return Scaffold(
      appBar: AppBar(title: const Text('달력')),
      body: Column(
        children: [
          Expanded(
            child: txsAsync.when(
              loading: () => SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  children: [
                    SkeletonBox(
                      width: double.infinity,
                      height: 320,
                      borderRadius: BorderRadius.circular(AppRadii.card),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Row(
                      children: [
                        Expanded(child: SkeletonBox(height: 72, borderRadius: BorderRadius.circular(AppRadii.card))),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(child: SkeletonBox(height: 72, borderRadius: BorderRadius.circular(AppRadii.card))),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    const SkeletonCard(),
                    const SizedBox(height: AppSpacing.sm),
                    const SkeletonCard(),
                  ],
                ),
              ),
              error: (error, _) => EmptyState(
                icon: Icons.error_outline,
                title: '오류가 발생했습니다',
                subtitle: error.toString(),
                actionLabel: '재시도',
                onAction: () => ref.invalidate(transactionsProvider),
              ),
              data: (transactions) {
                final monthTxs = _monthTxs(transactions);
                final selectedTxs =
                    transactions.where((t) => t.date == _fmt(_selectedDate)).toList();
                final totals = _dailyTotals(transactions, _selectedDate);

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(transactionsProvider);
                    await ref.read(transactionsProvider(null).future);
                  },
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: AppSpacing.xxl),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        AnimatedFadeSlide(
                          child: _buildCalendarCard(monthTxs),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        AnimatedFadeSlide(
                          delay: const Duration(milliseconds: 100),
                          child: _buildDailySummary(
                            expense: totals['expense']!,
                            income: totals['income']!,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        AnimatedFadeSlide(
                          delay: const Duration(milliseconds: 180),
                          child: _buildListHeader(selectedTxs.length),
                        ),
                        const SizedBox(height: AppSpacing.sm),

                        if (selectedTxs.isEmpty)
                          const EmptyState(
                            icon: Icons.receipt_long_outlined,
                            title: '이 날에 거래가 없습니다',
                            subtitle: '기록 탭에서 새 거래를 추가해 보세요',
                          )
                        else
                          _buildTxList(selectedTxs),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const AdBanner(),
        ],
      ),
    );
  }

  // ─── Calendar card ───────────────────────────────────────────
  Widget _buildCalendarCard(List<Transaction> monthTxs) {
    final theme = Theme.of(context);
    final onSurface = theme.colorScheme.onSurface;

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: GlassCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: TableCalendar<Transaction>(
          focusedDay: _focusedDate,
          firstDay: DateTime(2020),
          lastDay: DateTime(2030),
          selectedDayPredicate: (day) => isSameDay(_selectedDate, day),
          onDaySelected: (selectedDay, focusedDay) => setState(() {
            _selectedDate = selectedDay;
            _focusedDate = focusedDay;
          }),
          onPageChanged: (focusedDay) =>
              setState(() => _focusedDate = focusedDay),
          calendarStyle: CalendarStyle(
            todayDecoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.25),
              shape: BoxShape.circle,
            ),
            selectedDecoration: BoxDecoration(
              color: theme.colorScheme.primary,
              shape: BoxShape.circle,
            ),
            defaultTextStyle: TextStyle(color: onSurface),
            weekendTextStyle: TextStyle(color: AppColors.expense),
            outsideTextStyle: TextStyle(
              color: onSurface.withValues(alpha: 0.3),
            ),
          ),
          headerStyle: HeaderStyle(
            formatButtonVisible: false,
            titleCentered: true,
            titleTextStyle: theme.textTheme.titleMedium!.copyWith(
              fontWeight: FontWeight.w700,
            ),
            leftChevronIcon:
                Icon(Icons.chevron_left, color: onSurface),
            rightChevronIcon:
                Icon(Icons.chevron_right, color: onSurface),
          ),
          daysOfWeekStyle: DaysOfWeekStyle(
            weekendStyle: const TextStyle(
              color: AppColors.expense,
              fontWeight: FontWeight.w600,
            ),
            weekdayStyle: TextStyle(
              color: onSurface.withValues(alpha: 0.7),
              fontWeight: FontWeight.w600,
            ),
          ),
          calendarBuilders: CalendarBuilders(
            defaultBuilder: (context, day, focusedDay) =>
                _dayCell(day, monthTxs, selected: false, today: false),
            selectedBuilder: (context, day, focusedDay) =>
                _dayCell(day, monthTxs, selected: true, today: false),
            todayBuilder: (context, day, focusedDay) =>
                _dayCell(day, monthTxs, selected: false, today: true),
          ),
        ),
      ),
    );
  }

  Widget _dayCell(
    DateTime day,
    List<Transaction> monthTxs, {
    required bool selected,
    required bool today,
  }) {
    final theme = Theme.of(context);
    final indicators = _indicators(day, monthTxs);

    Color textColor;
    if (selected) {
      textColor = Colors.white;
    } else if (today) {
      textColor = theme.colorScheme.primary;
    } else {
      textColor = theme.colorScheme.onSurface;
    }

    // 날짜 셀은 TableCalendar가 부여하는 사각형 영역. 그 안쪽에 정사각형
    // AspectRatio 박스를 Center로 배치해 그 안에서만 circle decoration을 적용 →
    // 셀 전체가 파란 사각형으로 채워지는 문제를 해결.
    return Center(
      child: AspectRatio(
        aspectRatio: 1,
        child: Container(
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: selected
                ? theme.colorScheme.primary
                : (today
                    ? theme.colorScheme.primary.withValues(alpha: 0.12)
                    : Colors.transparent),
            shape: BoxShape.circle,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 14,
                  color: textColor,
                  fontWeight:
                      (today || selected) ? FontWeight.bold : FontWeight.w400,
                ),
              ),
              if (indicators.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: indicators
                        .map(
                          (c) => Container(
                            width: 4,
                            height: 4,
                            margin: const EdgeInsets.symmetric(horizontal: 1),
                            decoration: BoxDecoration(
                              color: selected
                                  ? Colors.white.withValues(alpha: 0.9)
                                  : c,
                              shape: BoxShape.circle,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Daily summary ───────────────────────────────────────────
  Widget _buildDailySummary({required double expense, required double income}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Row(
        children: [
          Expanded(
            child: _summaryChip(
              label: '지출',
              value: _formatCurrency(expense),
              accent: AppColors.expense,
              icon: Icons.trending_down,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: _summaryChip(
              label: '수입',
              value: _formatCurrency(income),
              accent: AppColors.income,
              icon: Icons.trending_up,
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryChip({
    required String label,
    required String value,
    required Color accent,
    required IconData icon,
  }) {
    return GlassCard(
      accentColor: accent,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: accent),
              const SizedBox(width: AppSpacing.xs),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: accent,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: accent,
            ),
          ),
        ],
      ),
    );
  }

  // ─── List header ─────────────────────────────────────────────
  Widget _buildListHeader(int count) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurface.withValues(alpha: 0.6);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '${DateFormat('yyyy년 MM월 dd일').format(_selectedDate)} 거래',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(
            '$count건',
            style: theme.textTheme.bodyMedium?.copyWith(color: muted),
          ),
        ],
      ),
    );
  }

  // ─── Transaction list ────────────────────────────────────────
  Widget _buildTxList(List<Transaction> txs) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: txs.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
          final t = txs[index];
          return AnimatedFadeSlide(
            delay: Duration(milliseconds: 40 * index),
            child: TransactionTile(
              transaction: t,
              onDelete: () => _deleteTransaction(t.id.toString()),
            ),
          );
        },
      ),
    );
  }
}
