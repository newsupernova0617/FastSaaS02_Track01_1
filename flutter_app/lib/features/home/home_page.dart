import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/models/summary_row.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/models/ai_action.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/providers/ai_feature_provider.dart';
import 'package:flutter_app/shared/providers/auto_report_provider.dart';
import 'package:flutter_app/shared/providers/report_provider.dart';
import 'package:flutter_app/shared/providers/transaction_provider.dart';
import 'package:flutter_app/shared/models/report.dart';
import 'package:flutter_app/shared/providers/ai_action_provider.dart';
import 'package:flutter_app/shared/widgets/animated_count_text.dart';
import 'package:flutter_app/shared/widgets/glowing_number.dart';
import 'package:flutter_app/shared/widgets/gradient_hero_card.dart';
import 'package:flutter_app/shared/widgets/prompt_chip.dart';
import 'package:flutter_app/shared/widgets/transaction_tile.dart';
import 'package:flutter_app/shared/widgets/user_profile_button.dart';

// ============================================================
// [Phase 3] home_page.dart
// Futuristic AI dashboard.
//
// Sections (vertical):
//   1. Greeting header (name, streak, profile avatar)
//   2. Hero card: this month's expense (animated count + violet→cyan glow)
//   3. AI insight card (client-side rule-based v1)
//   4. Quick action prompt chips
//   5. Recent transactions (top 5)
//   6. FAB: add expense (push /record modal)
// ============================================================

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  bool _isAskingAi = false;
  AiActionResponse? _homeAiResponse;
  String? _lastAiPrompt;
  String _selectedReportPeriod = 'weekly';

  Future<void> _askAi(String text) async {
    setState(() {
      _isAskingAi = true;
      _lastAiPrompt = text;
    });
    try {
      final response = await ref.read(aiActionControllerProvider).run(text);
      if (!mounted) return;
      setState(() => _homeAiResponse = response);
      ref.invalidate(allTransactionsProvider);
      ref.invalidate(getReportsProvider((month: null, limit: 20)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('AI 요청 실패: $e')));
    } finally {
      if (mounted) setState(() => _isAskingAi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final aiFeatureEnabled = ref.watch(aiFeatureUiProvider);

    final now = DateTime.now();
    final thisMonthKey = formatMonthFromDate(now);
    final lastMonth = DateTime(now.year, now.month - 1, 1);
    final lastMonthKey = formatMonthFromDate(lastMonth);

    final thisMonthSummary = ref.watch(summaryProvider(thisMonthKey));
    final lastMonthSummary = ref.watch(summaryProvider(lastMonthKey));
    final recentTxs = ref.watch(allTransactionsProvider);
    final reports = ref.watch(getReportsProvider((month: null, limit: 20)));
    ref.watch(ensureAutoReportsProvider);

    final name =
        (user?.userMetadata?['name'] as String?) ??
        user?.email?.split('@').first ??
        'there';

    return Scaffold(
      extendBody: true,
      backgroundColor: theme.scaffoldBackgroundColor,
      // floatingActionButton: _AddExpenseFab(
      //   onTap: () => context.push('/record'),
      // ),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(summaryProvider(thisMonthKey));
            ref.invalidate(summaryProvider(lastMonthKey));
            ref.invalidate(allTransactionsProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.xxl,
            ),
            children: [
              _Greeting(name: name),
              const SizedBox(height: AppSpacing.lg),

              // Hero "this month" card
              _MonthHero(
                    thisMonth: thisMonthSummary,
                    lastMonth: lastMonthSummary,
                    onTap: () => context.go('/stats'),
                  )
                  .animate()
                  .fadeIn(duration: 400.ms)
                  .slideY(
                    begin: 0.08,
                    end: 0,
                    duration: 400.ms,
                    curve: AppMotion.emphasizedDecel,
                  ),

              const SizedBox(height: AppSpacing.lg),

              _HomeAiAskBar(isLoading: _isAskingAi, onSend: _askAi),

              if (_homeAiResponse != null) ...[
                const SizedBox(height: AppSpacing.md),
                _HomeAiResponseCard(
                  prompt: _lastAiPrompt,
                  response: _homeAiResponse!,
                  onOpenChat: () => context.push('/chat'),
                ),
              ],

              const SizedBox(height: AppSpacing.xl),

              // Quick actions
              Text(
                '빠른 작업',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  PromptChip(
                    label: '지출 기록',
                    icon: FontAwesomeIcons.plus,
                    variant: PromptChipVariant.brand,
                    onTap: () => context.push('/record'),
                  ),
                  PromptChip(
                    label: 'AI에게 묻기',
                    icon: FontAwesomeIcons.wandMagicSparkles,
                    onTap: () =>
                        context.push(aiFeatureEnabled ? '/ai' : '/chat'),
                  ),
                  PromptChip(
                    label: '이번 달 보기',
                    icon: FontAwesomeIcons.chartPie,
                    onTap: () => context.go('/stats'),
                  ),
                  PromptChip(
                    label: '달력',
                    icon: FontAwesomeIcons.calendarDays,
                    onTap: () => context.go('/calendar'),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.xl),

              _AutoReportsSection(
                reports: reports,
                selectedPeriod: _selectedReportPeriod,
                onPeriodChanged: (period) =>
                    setState(() => _selectedReportPeriod = period),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Recent
              Row(
                children: [
                  Text(
                    '최근 거래',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.go('/calendar'),
                    child: const Text('전체 보기'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              _RecentList(txs: recentTxs),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeAiAskBar extends StatefulWidget {
  final bool isLoading;
  final ValueChanged<String> onSend;

  const _HomeAiAskBar({required this.isLoading, required this.onSend});

  @override
  State<_HomeAiAskBar> createState() => _HomeAiAskBarState();
}

class _HomeAiAskBarState extends State<_HomeAiAskBar> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.isLoading) return;
    widget.onSend(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.sm,
        top: AppSpacing.sm,
        bottom: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: theme.colorScheme.outline, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.auto_awesome_rounded, color: theme.colorScheme.primary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: TextField(
              controller: _controller,
              enabled: !widget.isLoading,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _send(),
              decoration: const InputDecoration(
                hintText: 'AI에게 바로 물어보기',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                isCollapsed: true,
                filled: false,
                contentPadding: EdgeInsets.symmetric(vertical: AppSpacing.md),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          IconButton.filled(
            onPressed: widget.isLoading ? null : _send,
            icon: widget.isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.arrow_upward_rounded),
          ),
        ],
      ),
    );
  }
}

class _HomeAiResponseCard extends StatelessWidget {
  final String? prompt;
  final AiActionResponse response;
  final VoidCallback onOpenChat;

  const _HomeAiResponseCard({
    required this.prompt,
    required this.response,
    required this.onOpenChat,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final transactions = response.transactions.take(3).toList();
    final reportId = response.reportId;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.45),
          width: 0.6,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  gradient: AppGradients.brand,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  prompt == null ? 'AI 응답' : '"$prompt"',
                  style: theme.textTheme.titleMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton(onPressed: onOpenChat, child: const Text('대화 열기')),
            ],
          ),
          if (response.message != null && response.message!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text(response.message!, style: theme.textTheme.bodyMedium),
          ],
          if (transactions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            for (final tx in transactions)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: _InlineTransactionResult(transaction: tx),
              ),
            if (response.transactions.length > transactions.length)
              Text(
                '외 ${response.transactions.length - transactions.length}건',
                style: theme.textTheme.bodySmall,
              ),
          ],
          if (reportId != null) ...[
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => context.push('/report/$reportId'),
                icon: const Icon(Icons.bar_chart_rounded),
                label: const Text('리포트 보기'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InlineTransactionResult extends StatelessWidget {
  final Transaction transaction;

  const _InlineTransactionResult({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isExpense = transaction.type == 'expense';
    final color = isExpense ? AppColors.expense : AppColors.income;
    final amount = NumberFormat('#,###', 'ko_KR').format(transaction.amount);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Row(
        children: [
          Icon(
            isExpense
                ? Icons.arrow_downward_rounded
                : Icons.arrow_upward_rounded,
            color: color,
            size: 16,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              transaction.memo?.isNotEmpty == true
                  ? transaction.memo!
                  : transaction.category ?? '미분류',
              style: theme.textTheme.bodyMedium,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            '${isExpense ? '-' : '+'}$amount원',
            style: theme.textTheme.labelLarge?.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}

class _AutoReportsSection extends StatelessWidget {
  final AsyncValue<List<ReportSummary>> reports;
  final String selectedPeriod;
  final ValueChanged<String> onPeriodChanged;

  const _AutoReportsSection({
    required this.reports,
    required this.selectedPeriod,
    required this.onPeriodChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              '정기 리포트',
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        _ReportPeriodTabs(
          selectedPeriod: selectedPeriod,
          onChanged: onPeriodChanged,
        ),
        const SizedBox(height: AppSpacing.md),
        reports.when(
          loading: () => const SizedBox(
            height: 4,
            width: double.infinity,
            child: LinearProgressIndicator(),
          ),
          error: (_, __) => _ReportStatusCard(
            title: '리포트를 불러오지 못했습니다',
            subtitle: '잠시 후 다시 시도해 주세요.',
            icon: Icons.error_outline_rounded,
            onTap: () => context.push('/monthly-report'),
          ),
          data: (items) {
            final weekly = _latestByType(items, 'weekly_summary');
            final monthly = _latestByType(items, 'monthly_summary');
            final isWeekly = selectedPeriod == 'weekly';
            final report = isWeekly ? weekly : monthly;
            return _ReportStatusCard(
              title: isWeekly ? '주간 리포트' : '월간 리포트',
              subtitle:
                  report?.title ??
                  (isWeekly ? '이번 주 리포트 생성 대기 중' : '이번 달 리포트 생성 대기 중'),
              icon: isWeekly
                  ? Icons.calendar_view_week_rounded
                  : Icons.calendar_month_rounded,
              onTap: report == null
                  ? () => context.push('/monthly-report')
                  : () => context.push('/report/${report.id}'),
            );
          },
        ),
      ],
    );
  }

  ReportSummary? _latestByType(List<ReportSummary> reports, String type) {
    final matches = reports.where((r) => r.reportType == type).toList();
    if (matches.isEmpty) return null;
    return matches.first;
  }
}

class _ReportPeriodTabs extends StatelessWidget {
  final String selectedPeriod;
  final ValueChanged<String> onChanged;

  const _ReportPeriodTabs({
    required this.selectedPeriod,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<String>(
      segments: const [
        ButtonSegment(
          value: 'weekly',
          label: Text('주간'),
          icon: Icon(Icons.calendar_view_week_rounded),
        ),
        ButtonSegment(
          value: 'monthly',
          label: Text('월간'),
          icon: Icon(Icons.calendar_month_rounded),
        ),
      ],
      selected: {selectedPeriod},
      showSelectedIcon: false,
      onSelectionChanged: (selection) => onChanged(selection.first),
    );
  }
}

class _ReportStatusCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _ReportStatusCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: double.infinity,
      height: 118,
      child: Semantics(
        button: true,
        onTap: onTap,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(AppRadii.card),
              border: Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.4),
                width: 0.5,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: AppColors.primary),
                  const Spacer(),
                  Text(title, style: theme.textTheme.titleMedium),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Greeting
// ────────────────────────────────────────────────────────────
class _Greeting extends StatelessWidget {
  final String name;
  const _Greeting({required this.name});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hour = DateTime.now().hour;
    final greet = hour < 6
        ? 'Late night'
        : hour < 12
        ? 'Good morning'
        : hour < 18
        ? 'Good afternoon'
        : 'Good evening';

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                greet,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                ),
              ),
              const SizedBox(height: 2),
              ShaderMask(
                shaderCallback: (bounds) => AppGradients.brand.createShader(
                  Rect.fromLTWH(0, 0, bounds.width, bounds.height),
                ),
                blendMode: BlendMode.srcIn,
                child: Text(
                  name,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
            ],
          ),
        ),
        const UserProfileButton(),
      ],
    );
  }
}

// ────────────────────────────────────────────────────────────
// Month Hero card
// ────────────────────────────────────────────────────────────
class _MonthHero extends StatelessWidget {
  final AsyncValue<List<SummaryRow>> thisMonth;
  final AsyncValue<List<SummaryRow>> lastMonth;
  final VoidCallback onTap;

  const _MonthHero({
    required this.thisMonth,
    required this.lastMonth,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final monthLabel = DateFormat('yyyy년 M월').format(DateTime.now());
    final currency = NumberFormat('#,###', 'ko_KR');

    final thisExpense =
        thisMonth.value
            ?.where((r) => r.type == 'expense')
            .fold<num>(0, (sum, r) => sum + r.total) ??
        0;
    final lastExpense =
        lastMonth.value
            ?.where((r) => r.type == 'expense')
            .fold<num>(0, (sum, r) => sum + r.total) ??
        0;

    final delta = lastExpense == 0
        ? null
        : ((thisExpense - lastExpense) / lastExpense) * 100;

    return GradientHeroCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '$monthLabel · 지출',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: Colors.white.withValues(alpha: 0.78),
                  letterSpacing: 0.8,
                ),
              ),
              const Spacer(),
              Icon(
                Icons.arrow_forward_rounded,
                size: 18,
                color: Colors.white.withValues(alpha: 0.72),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          thisMonth.when(
            data: (_) => AnimatedCountText(
              to: thisExpense.toDouble(),
              duration: AppMotion.count,
              formatter: (v) => '₩${currency.format(v.round())}',
              builder: (context, text) => GlowingNumber(text, fontSize: 42),
            ),
            loading: () => GlowingNumber(
              '₩${currency.format(thisExpense.round())}',
              fontSize: 42,
              glow: false,
            ),
            error: (_, __) => Text(
              '불러오기 실패',
              style: theme.textTheme.titleLarge?.copyWith(color: Colors.white),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (delta != null) _DeltaBadge(delta: delta),
        ],
      ),
    );
  }
}

class _DeltaBadge extends StatelessWidget {
  final double delta;
  const _DeltaBadge({required this.delta});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final up = delta >= 0;
    final color = up ? AppColors.expense : AppColors.income;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm + 2,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: color.withValues(alpha: 0.35), width: 0.6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            up ? Icons.trending_up_rounded : Icons.trending_down_rounded,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            '지난달 대비 ${delta.abs().toStringAsFixed(1)}% ${up ? "증가" : "감소"}',
            style: theme.textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
// AI Insight section (client-side rule based)
// ────────────────────────────────────────────────────────────
class _InsightSection extends ConsumerWidget {
  final AsyncValue<List<SummaryRow>> thisMonth;
  final AsyncValue<List<SummaryRow>> lastMonth;

  const _InsightSection({required this.thisMonth, required this.lastMonth});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final insight = _computeInsight(
      thisMonth.value ?? const [],
      lastMonth.value ?? const [],
    );
    return AIInsightCard(
      body: insight ?? '아직 인사이트를 만들 데이터가 충분하지 않아요. 몇 건 더 기록해보세요.',
      actions: insight == null
          ? const []
          : [
              PromptChip(
                label: '자세히',
                icon: FontAwesomeIcons.chartPie,
                onTap: () {
                  GoRouter.of(context).go('/stats');
                },
              ),
              PromptChip(
                label: 'AI에게 묻기',
                icon: FontAwesomeIcons.wandMagicSparkles,
                variant: PromptChipVariant.brand,
                onTap: () => GoRouter.of(context).push('/chat'),
              ),
            ],
    );
  }

  /// Returns a short Korean insight or null if data is insufficient.
  String? _computeInsight(
    List<SummaryRow> thisMonth,
    List<SummaryRow> lastMonth,
  ) {
    if (thisMonth.isEmpty || lastMonth.isEmpty) return null;

    // Build category map for each month (expense only).
    final now = <String, num>{};
    for (final r in thisMonth) {
      if (r.type != 'expense') continue;
      now[r.category] = (now[r.category] ?? 0) + r.total;
    }
    final prev = <String, num>{};
    for (final r in lastMonth) {
      if (r.type != 'expense') continue;
      prev[r.category] = (prev[r.category] ?? 0) + r.total;
    }
    if (now.isEmpty) return null;

    // Find largest percentage increase vs last month (minimum threshold).
    String? topCat;
    double topDelta = 0;
    num topNow = 0;
    now.forEach((cat, value) {
      final lastValue = prev[cat] ?? 0;
      if (lastValue <= 0) return;
      final delta = ((value - lastValue) / lastValue) * 100;
      if (delta > topDelta && delta.abs() > 15 && value >= 5000) {
        topDelta = delta;
        topCat = cat;
        topNow = value;
      }
    });

    if (topCat != null) {
      final currency = NumberFormat('#,###', 'ko_KR');
      return '이번 달 "$topCat" 지출이 지난달보다 '
          '${topDelta.toStringAsFixed(0)}% 늘었어요. '
          '현재 ₩${currency.format(topNow.round())}입니다.';
    }

    // Fallback: highlight the largest single category this month.
    final largest = now.entries.reduce((a, b) => a.value >= b.value ? a : b);
    final pct =
        largest.value / now.values.fold<num>(0, (sum, v) => sum + v) * 100;
    return '이번 달 지출의 ${pct.toStringAsFixed(0)}%가 '
        '"${largest.key}" 카테고리에 집중되어 있어요.';
  }
}

// ────────────────────────────────────────────────────────────
// Recent transactions list
// ────────────────────────────────────────────────────────────
class _RecentList extends ConsumerWidget {
  final AsyncValue<List<Transaction>> txs;

  const _RecentList({required this.txs});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return txs.when(
      data: (list) {
        if (list.isEmpty) {
          return _EmptyRecent();
        }
        final top = list.take(5).toList();
        return Column(
          children: [
            for (final t in top)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: TransactionTile(transaction: t),
              ),
          ],
        );
      },
      loading: () => Column(
        children: List.generate(
          3,
          (_) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
            child: _ShimmerTile(),
          ),
        ),
      ),
      error: (_, __) => const _EmptyRecent(),
    );
  }
}

class _EmptyRecent extends StatelessWidget {
  const _EmptyRecent();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.4),
          width: 0.5,
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: 36,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
          ),
          const SizedBox(height: AppSpacing.md),
          Text('아직 기록된 거래가 없어요', style: theme.textTheme.titleMedium),
          const SizedBox(height: 4),
          Text('첫 지출을 기록해보세요', style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _ShimmerTile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
          height: 64,
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadii.card),
            border: Border.all(
              color: theme.colorScheme.outline.withValues(alpha: 0.3),
              width: 0.5,
            ),
          ),
        )
        .animate(onPlay: (c) => c.repeat())
        .shimmer(
          duration: 1200.ms,
          color: AppColors.primary.withValues(alpha: 0.08),
        );
  }
}

// ────────────────────────────────────────────────────────────
// FAB — add expense
// ────────────────────────────────────────────────────────────
// ignore: unused_element
class _AddExpenseFab extends StatelessWidget {
  final VoidCallback onTap;
  const _AddExpenseFab({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 72),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.md + 2,
          ),
          decoration: BoxDecoration(
            gradient: AppGradients.brand,
            borderRadius: BorderRadius.circular(AppRadii.pill),
            boxShadow: AppGlow.medium(),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(Icons.add_rounded, color: Colors.white, size: 20),
              SizedBox(width: 6),
              Text(
                '지출 기록',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
