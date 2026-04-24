import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/models/transaction.dart';

class AiSearchResultCard extends StatefulWidget {
  final List<Transaction> transactions;
  final Map<String, dynamic>? metadata;
  final String? query;
  final bool showHeader;

  const AiSearchResultCard({
    super.key,
    required this.transactions,
    this.metadata,
    this.query,
    this.showHeader = true,
  });

  @override
  State<AiSearchResultCard> createState() => _AiSearchResultCardState();
}

class _AiSearchResultCardState extends State<AiSearchResultCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currency = NumberFormat('#,###', 'ko_KR');
    final summary = _summary;
    final total =
        _num(summary['totalAmount']) ??
        widget.transactions.fold<num>(0, (sum, tx) => sum + tx.amount);
    final count = _int(summary['count']) ?? widget.transactions.length;
    final average =
        _num(summary['dailyAverage']) ??
        _dailyAverage(widget.transactions, total);
    final breakdown = _breakdown(summary['breakdown']);
    final visibleTransactions = _expanded
        ? widget.transactions
        : widget.transactions.take(5).toList();
    final periodLabel = _text(summary['periodLabel']) ?? _monthLabel ?? '조회 기간';
    final categoryLabel =
        _text(summary['categoryLabel']) ?? _categoryLabel ?? '전체';
    final insight = _text(summary['insight']) ?? _fallbackInsight(breakdown);

    return Container(
      width: double.infinity,
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
          if (widget.showHeader) ...[
            _SearchQueryPill(
              query: widget.query ?? '$periodLabel $categoryLabel',
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          Text(
            periodLabel,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.52),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text.rich(
            TextSpan(
              text: currency.format(total.round()),
              children: const [
                TextSpan(text: '원', style: TextStyle(fontSize: 15)),
              ],
            ),
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '총 $count건 · 하루 평균 ${currency.format(average.round())}원',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.62),
            ),
          ),
          if (breakdown.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            const SizedBox(height: AppSpacing.md),
            for (final item in breakdown)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: _BreakdownRow(
                  label: item.label,
                  amount: '${currency.format(item.amount.round())}원',
                ),
              ),
          ],
          if (insight != null) ...[
            const SizedBox(height: AppSpacing.sm),
            _InsightStrip(text: insight),
          ],
          if (visibleTransactions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            for (final tx in visibleTransactions)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: _SearchTransactionRow(transaction: tx),
              ),
          ],
          if (widget.transactions.length > 5)
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () => setState(() => _expanded = !_expanded),
                icon: Icon(
                  _expanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  size: 18,
                ),
                label: Text(
                  _expanded ? '접기' : '전체 ${widget.transactions.length}건 보기',
                ),
              ),
            ),
          if (widget.transactions.isEmpty)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.push('/record'),
                icon: const Icon(Icons.add_rounded),
                label: const Text('거래 기록하기'),
              ),
            ),
        ],
      ),
    );
  }

  Map<String, dynamic> get _summary {
    final summary = widget.metadata?['summary'];
    if (summary is Map<String, dynamic>) return summary;
    return const {};
  }

  String? get _monthLabel {
    final action = widget.metadata?['action'];
    if (action is Map<String, dynamic>) return _text(action['month']);
    return null;
  }

  String? get _categoryLabel {
    final action = widget.metadata?['action'];
    if (action is Map<String, dynamic>) return _text(action['category']);
    return null;
  }

  num _dailyAverage(List<Transaction> transactions, num total) {
    final days = transactions.map((tx) => tx.date).toSet().length;
    if (days == 0) return 0;
    return total / days;
  }

  List<_BreakdownItem> _breakdown(Object? raw) {
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(
            (item) => _BreakdownItem(
              label: _text(item['label']) ?? '미분류',
              amount: _num(item['amount']) ?? 0,
            ),
          )
          .where((item) => item.amount > 0)
          .toList();
    }

    final map = <String, num>{};
    for (final tx in widget.transactions) {
      final label = tx.memo?.trim().isNotEmpty == true
          ? tx.memo!.trim()
          : tx.category ?? '미분류';
      map[label] = (map[label] ?? 0) + tx.amount;
    }
    final items =
        map.entries
            .map(
              (entry) => _BreakdownItem(label: entry.key, amount: entry.value),
            )
            .toList()
          ..sort((a, b) => b.amount.compareTo(a.amount));
    return items.take(3).toList();
  }

  String? _fallbackInsight(List<_BreakdownItem> breakdown) {
    if (breakdown.isEmpty) return null;
    return '${breakdown.first.label} 항목이 가장 큰 비중을 차지합니다.';
  }

  String? _text(Object? value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  num? _num(Object? value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }

  int? _int(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }
}

class _BreakdownItem {
  final String label;
  final num amount;

  const _BreakdownItem({required this.label, required this.amount});
}

class _SearchQueryPill extends StatelessWidget {
  final String query;

  const _SearchQueryPill({required this.query});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Row(
        children: [
          Icon(
            Icons.search_rounded,
            size: 16,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              query,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BreakdownRow extends StatelessWidget {
  final String label;
  final String amount;

  const _BreakdownRow({required this.label, required this.amount});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall,
          ),
        ),
        Text(
          amount,
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _InsightStrip extends StatelessWidget {
  final String text;

  const _InsightStrip({required this.text});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.16),
        ),
      ),
      child: Text(
        '💡 $text',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.72),
        ),
      ),
    );
  }
}

class _SearchTransactionRow extends StatelessWidget {
  final Transaction transaction;

  const _SearchTransactionRow({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isExpense = transaction.type == 'expense';
    final color = isExpense ? AppColors.expense : AppColors.income;
    final amount = NumberFormat('#,###', 'ko_KR').format(transaction.amount);
    final date = DateTime.tryParse(transaction.date);
    final dateLabel = date == null
        ? transaction.date
        : DateFormat('M.d', 'ko_KR').format(date);
    final title = transaction.memo?.isNotEmpty == true
        ? transaction.memo!
        : transaction.category ?? '미분류';

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(
          alpha: 0.55,
        ),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$dateLabel · ${transaction.category ?? '미분류'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                ),
              ],
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
