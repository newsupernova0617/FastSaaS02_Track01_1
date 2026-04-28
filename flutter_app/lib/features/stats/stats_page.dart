import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/transaction_provider.dart';
import 'package:flutter_app/shared/models/summary_row.dart';
import 'package:flutter_app/shared/widgets/ad_banner.dart';
import 'package:flutter_app/shared/widgets/animated_fade_slide.dart';
import 'package:flutter_app/shared/widgets/empty_state.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';
import 'package:flutter_app/shared/widgets/section_header.dart';
import 'package:flutter_app/shared/widgets/skeleton.dart';
import '../../shared/providers/report_provider.dart';
import '../reports/report_list_item.dart';

// ============================================================
// [통계 화면] stats_page.dart
// 월별 수입/지출 통계와 저장된 리포트를 보여주는 화면.
// 2개 탭: [통계] / [리포트]
// 데이터:
//   summaryProvider(monthString) — 월별 카테고리별 합계
//   getReportsProvider          — 저장된 리포트 목록
// ============================================================
class StatsPage extends ConsumerStatefulWidget {
  final String? initialMonth;

  const StatsPage({super.key, this.initialMonth});

  @override
  ConsumerState<StatsPage> createState() => _StatsPageState();
}

class _StatsPageState extends ConsumerState<StatsPage> {
  late DateTime _selectedDate;
  int? _touchedExpenseIndex;
  int? _touchedIncomeIndex;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
    final monthStr = widget.initialMonth;
    if (monthStr == null) return;

    try {
      final parts = monthStr.split('-');
      if (parts.length != 2) return;

      final parsedDate = DateTime(
        int.parse(parts[0]),
        int.parse(parts[1]),
      );

      if (parsedDate.year == _selectedDate.year &&
          parsedDate.month == _selectedDate.month) {
        return;
      }

      setState(() {
        _selectedDate = parsedDate;
      });
    } catch (_) {
      // ignore invalid format
    }
  }

  String _formatMonthYear(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final monthString = _formatMonthYear(_selectedDate);
    final summaryAsync = ref.watch(summaryProvider(monthString));
    final theme = Theme.of(context);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('통계'),
          elevation: 0,
          bottom: TabBar(
            labelColor: theme.appBarTheme.foregroundColor,
            unselectedLabelColor: theme.appBarTheme.foregroundColor?.withValues(
              alpha: 0.65,
            ),
            indicatorColor: theme.appBarTheme.foregroundColor,
            indicatorWeight: 3,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500),
            tabs: const [
              Tab(text: '통계'),
              Tab(text: '리포트'),
            ],
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: TabBarView(
                children: [
                  summaryAsync.when(
                    data: (summary) =>
                        _buildContent(context, summary, ref, monthString),
                    loading: () => SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                        vertical: AppSpacing.xl,
                      ),
                      child: Column(
                        children: const [
                          SkeletonCard(),
                          SizedBox(height: AppSpacing.md),
                          SkeletonCard(),
                          SizedBox(height: AppSpacing.md),
                          SkeletonCard(),
                          SizedBox(height: AppSpacing.xl),
                          SkeletonCard(height: 220),
                        ],
                      ),
                    ),
                    error: (error, _) => _buildError(context, error),
                  ),
                  const SavedReportsTab(),
                ],
              ),
            ),
            const AdBanner(),
          ],
        ),
      ),
    );
  }

  // ─── Error view ──────────────────────────────────────────────
  Widget _buildError(BuildContext context, Object error) {
    return EmptyState(
      icon: Icons.error_outline,
      title: '오류가 발생했습니다',
      subtitle: error.toString(),
      actionLabel: '재시도',
      onAction: () =>
          ref.invalidate(summaryProvider(_formatMonthYear(_selectedDate))),
    );
  }

  // ─── Main content ────────────────────────────────────────────
  Widget _buildContent(
    BuildContext context,
    List<SummaryRow> summary,
    WidgetRef ref,
    String monthString,
  ) {
    final expenseSummary = summary.where((s) => s.type == 'expense').toList();
    final incomeSummary = summary.where((s) => s.type == 'income').toList();

    final totalExpense = expenseSummary.fold<num>(0, (sum, s) => sum + s.total);
    final totalIncome = incomeSummary.fold<num>(0, (sum, s) => sum + s.total);
    final netAmount = totalIncome - totalExpense;

    final categoryColors = _getCategoryColors();

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(summaryProvider(monthString));
        await ref.read(summaryProvider(monthString).future);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: AppSpacing.xxl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildMonthNavigation(context),
            const SizedBox(height: AppSpacing.lg),

            // Summary cards
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Column(
                children: [
                  AnimatedFadeSlide(
                    delay: const Duration(milliseconds: 0),
                    child: _buildSummaryCard(
                      context: context,
                      label: '총 지출',
                      amount: totalExpense,
                      accent: AppColors.expense,
                      icon: Icons.trending_down,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AnimatedFadeSlide(
                    delay: const Duration(milliseconds: 80),
                    child: _buildSummaryCard(
                      context: context,
                      label: '총 수입',
                      amount: totalIncome,
                      accent: AppColors.income,
                      icon: Icons.trending_up,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AnimatedFadeSlide(
                    delay: const Duration(milliseconds: 160),
                    child: _buildSummaryCard(
                      context: context,
                      label: '순 자산 변화',
                      amount: netAmount,
                      accent: netAmount >= 0
                          ? AppColors.success
                          : AppColors.expense,
                      icon: netAmount >= 0
                          ? Icons.account_balance_wallet
                          : Icons.warning_amber,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            if (expenseSummary.isNotEmpty) ...[
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 200),
                child: const SectionHeader(
                  title: '지출 내역',
                  leadingIcon: Icons.pie_chart_outline,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 240),
                child: _buildPieSection(
                  data: expenseSummary,
                  colors: categoryColors,
                  touched: _touchedExpenseIndex,
                  onTouch: (i) => setState(() => _touchedExpenseIndex = i),
                  total: totalExpense,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 280),
                child: const SectionHeader(title: '지출 카테고리 상세'),
              ),
              const SizedBox(height: AppSpacing.md),
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 320),
                child: _buildCategoryBreakdown(
                  expenseSummary,
                  totalExpense,
                  categoryColors,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],

            if (incomeSummary.isNotEmpty) ...[
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 360),
                child: const SectionHeader(
                  title: '수입 내역',
                  leadingIcon: Icons.bar_chart,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 400),
                child: _buildPieSection(
                  data: incomeSummary,
                  colors: categoryColors,
                  touched: _touchedIncomeIndex,
                  onTouch: (i) => setState(() => _touchedIncomeIndex = i),
                  total: totalIncome,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 440),
                child: const SectionHeader(title: '수입 카테고리 상세'),
              ),
              const SizedBox(height: AppSpacing.md),
              AnimatedFadeSlide(
                delay: const Duration(milliseconds: 480),
                child: _buildCategoryBreakdown(
                  incomeSummary,
                  totalIncome,
                  categoryColors,
                ),
              ),
            ],

            if (expenseSummary.isEmpty && incomeSummary.isEmpty)
              const EmptyState(
                icon: Icons.trending_up,
                title: '이 달에 거래 내역이 없습니다',
                subtitle: '월을 바꾸거나 기록 탭에서 거래를 추가해 보세요',
              ),
          ],
        ),
      ),
    );
  }

  // ─── Month navigation ────────────────────────────────────────
  Widget _buildMonthNavigation(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              AppColors.primary.withValues(alpha: 0.10),
              AppColors.primarySoft.withValues(alpha: 0.08),
            ],
          ),
          borderRadius: BorderRadius.circular(AppRadii.pill),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.25),
            width: 0.6,
          ),
        ),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left_rounded),
              color: theme.colorScheme.primary,
              onPressed: () => setState(
                () => _selectedDate = DateTime(
                  _selectedDate.year,
                  _selectedDate.month - 1,
                ),
              ),
            ),
            Expanded(
              child: Center(
                child: Text(
                  '${_selectedDate.year}년 ${_selectedDate.month}월',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right_rounded),
              color: theme.colorScheme.primary,
              onPressed: () => setState(
                () => _selectedDate = DateTime(
                  _selectedDate.year,
                  _selectedDate.month + 1,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Summary card ────────────────────────────────────────────
  Widget _buildSummaryCard({
    required BuildContext context,
    required String label,
    required num amount,
    required Color accent,
    required IconData icon,
  }) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurface.withValues(alpha: 0.6);

    return GlassCard(
      accentColor: accent,
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Icon(icon, color: accent, size: 22),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodyMedium?.copyWith(color: muted),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${amount.toStringAsFixed(0)}원',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Pie chart section ───────────────────────────────────────
  Widget _buildPieSection({
    required List<SummaryRow> data,
    required Map<String, Color> colors,
    required int? touched,
    required ValueChanged<int?> onTouch,
    required num total,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: GlassCard(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isStacked = constraints.maxWidth < 560;
            final chartSize = isStacked
                ? (constraints.maxWidth - AppSpacing.lg)
                      .clamp(168.0, 224.0)
                      .toDouble()
                : (constraints.maxWidth * 0.42).clamp(224.0, 264.0).toDouble();
            final legend = _buildPieLegend(
              context: context,
              data: data,
              colors: colors,
              touched: touched,
              fullWidth: isStacked,
            );
            final chart = SizedBox.square(
              dimension: chartSize,
              child: PieChart(
                PieChartData(
                  sections: _buildPieChartData(
                    data,
                    colors,
                    touched,
                    total,
                    chartSize,
                  ),
                  centerSpaceRadius: chartSize * 0.16,
                  sectionsSpace: 3,
                  startDegreeOffset: -90,
                  pieTouchData: PieTouchData(
                    touchCallback: (event, response) {
                      if (!event.isInterestedForInteractions ||
                          response == null ||
                          response.touchedSection == null) {
                        onTouch(null);
                        return;
                      }
                      onTouch(response.touchedSection!.touchedSectionIndex);
                    },
                  ),
                ),
              ),
            );

            if (isStacked) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: chart),
                  const SizedBox(height: AppSpacing.lg),
                  legend,
                ],
              );
            }

            return Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(child: Center(child: chart)),
                const SizedBox(width: AppSpacing.xl),
                Expanded(flex: 2, child: legend),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildPieLegend({
    required BuildContext context,
    required List<SummaryRow> data,
    required Map<String, Color> colors,
    required int? touched,
    required bool fullWidth,
  }) {
    final theme = Theme.of(context);
    final visibleItems = data.take(6).toList();

    Widget buildItem(MapEntry<int, SummaryRow> entry) {
      final i = entry.key;
      final item = entry.value;
      final color =
          colors[item.category] ??
          theme.colorScheme.onSurface.withValues(alpha: 0.3);
      final isActive = touched == i;

      return Container(
        width: fullWidth ? double.infinity : null,
        constraints: const BoxConstraints(minWidth: 112),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isActive
              ? color.withValues(alpha: 0.12)
              : theme.colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.35,
                ),
          borderRadius: BorderRadius.circular(AppRadii.pill),
          border: Border.all(
            color: isActive
                ? color.withValues(alpha: 0.45)
                : theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: AppSpacing.xs),
            Flexible(
              child: Text(
                item.category,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                  color: isActive
                      ? theme.colorScheme.onSurface
                      : theme.colorScheme.onSurface.withValues(alpha: 0.75),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    final entries = visibleItems.asMap().entries.toList();
    if (fullWidth) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final entry in entries) ...[
            buildItem(entry),
            if (entry.key != entries.length - 1)
              const SizedBox(height: AppSpacing.sm),
          ],
        ],
      );
    }

    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: entries.map(buildItem).toList(),
    );
  }

  List<PieChartSectionData> _buildPieChartData(
    List<SummaryRow> data,
    Map<String, Color> categoryColors,
    int? touched,
    num total,
    double chartSize,
  ) {
    return data.asMap().entries.map((entry) {
      final i = entry.key;
      final item = entry.value;
      final isTouched = touched == i;
      final ratio = item.total / total;
      final percentage = (ratio * 100).toStringAsFixed(1);
      final color = categoryColors[item.category] ?? Colors.grey;
      final baseRadius = chartSize * 0.27;
      final touchedRadius = chartSize * 0.31;
      final showLabel = ratio >= (data.length > 5 ? 0.10 : 0.08);

      return PieChartSectionData(
        value: item.total.toDouble(),
        title: showLabel || isTouched ? '$percentage%' : '',
        radius: isTouched ? touchedRadius : baseRadius,
        titleStyle: TextStyle(
          fontSize: isTouched ? 13 : 11,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        color: color,
      );
    }).toList();
  }

  // ─── Category breakdown ──────────────────────────────────────
  Widget _buildCategoryBreakdown(
    List<SummaryRow> summary,
    num totalAmount,
    Map<String, Color> categoryColors,
  ) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurface.withValues(alpha: 0.6);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Column(
        children: summary.map((item) {
          final pct = totalAmount == 0 ? 0.0 : item.total / totalAmount;
          final color =
              categoryColors[item.category] ??
              theme.colorScheme.onSurface.withValues(alpha: 0.3);

          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Flexible(
                            child: Text(
                              item.category,
                              style: theme.textTheme.bodyMedium,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${item.total.toStringAsFixed(0)}원',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadii.sm),
                        child: TweenAnimationBuilder<double>(
                          tween: Tween(begin: 0, end: pct),
                          duration: const Duration(milliseconds: 700),
                          curve: Curves.easeOutCubic,
                          builder: (context, value, _) {
                            return LinearProgressIndicator(
                              value: value,
                              minHeight: 6,
                              backgroundColor:
                                  theme.colorScheme.surfaceContainerHighest,
                              valueColor: AlwaysStoppedAnimation<Color>(color),
                            );
                          },
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      '${(pct * 100).toStringAsFixed(1)}%',
                      style: theme.textTheme.bodySmall?.copyWith(color: muted),
                    ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Map<String, Color> _getCategoryColors() {
    return const {
      // Expense categories
      '식비': Color(0xFFFF6B6B),
      '교통': Color(0xFF4ECDC4),
      '쇼핑': Color(0xFFFFE66D),
      '의료': Color(0xFF95E1D3),
      '문화여가': Color(0xFFA8D8EA),
      '월세': Color(0xFFFF8B94),
      '기타': Color(0xFFCCCCCC),
      // Income categories
      '월급': Color(0xFF3B82F6),
      '부업': Color(0xFF10B981),
      '용돈': Color(0xFF8B5CF6),
    };
  }
}

// ============================================================
// [저장된 리포트 탭] SavedReportsTab
// ============================================================
class SavedReportsTab extends ConsumerWidget {
  const SavedReportsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(
      getReportsProvider((month: null, limit: 50)),
    );

    return reportsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
        child: SkeletonList(count: 4),
      ),
      error: (error, _) => EmptyState(
        icon: Icons.error_outline,
        title: '리포트 목록을 불러오지 못했습니다',
        subtitle: error.toString(),
        actionLabel: '재시도',
        onAction: () =>
            ref.invalidate(getReportsProvider((month: null, limit: 50))),
      ),
      data: (reports) {
        if (reports.isEmpty) {
          return const EmptyState(
            icon: Icons.bookmark_outline,
            title: '저장된 리포트가 없습니다',
            subtitle: 'Chat에서 리포트를 생성하고 저장해 보세요',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.md,
            AppSpacing.lg,
            AppSpacing.xxl,
          ),
          itemCount: reports.length,
          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (context, index) => AnimatedFadeSlide(
            delay: Duration(milliseconds: 40 * index),
            child: ReportListItem(report: reports[index]),
          ),
        );
      },
    );
  }
}
