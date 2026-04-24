import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/models/transaction.dart';

// ============================================================
// [공유 위젯] transaction_tile.dart
// 거래 목록 한 줄. CalendarPage / 이후 ReportDetail 등에서 재사용.
// 카테고리 이모지 + 카테고리명 + 메모 + 금액 + 삭제 버튼.
// 라이트/다크 모드 모두 지원.
// ============================================================
class TransactionTile extends StatelessWidget {
  final Transaction transaction;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;

  const TransactionTile({
    super.key,
    required this.transaction,
    this.onDelete,
    this.onTap,
  });

  static const _categoryEmojis = {
    '식비': '🍽️',
    '교통': '🚗',
    '쇼핑': '🛍️',
    '의료': '⚕️',
    '문화여가': '🎬',
    '월세': '🏠',
    '기타': '📦',
    '월급': '💰',
    '부업': '💼',
    '용돈': '💸',
  };

  String _emoji(String? category) => _categoryEmojis[category] ?? '📌';

  String _formatCurrency(num value) {
    return '₩${value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    )}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isExpense = transaction.type == 'expense';
    final accent = isExpense ? AppColors.expense : AppColors.income;
    final muted = theme.colorScheme.onSurface.withValues(alpha: 0.6);

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadii.card),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.card),
            border: Border.all(
              color: theme.colorScheme.outline.withValues(alpha: 0.25),
            ),
          ),
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              // Category icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadii.md),
                ),
                child: Center(
                  child: Text(
                    _emoji(transaction.category),
                    style: const TextStyle(fontSize: 22),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            transaction.category ?? '기타',
                            style: theme.textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          '${isExpense ? '-' : '+'} ${_formatCurrency(transaction.amount)}',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: accent,
                          ),
                        ),
                      ],
                    ),
                    if (transaction.memo != null &&
                        transaction.memo!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        transaction.memo!,
                        style: theme.textTheme.bodySmall?.copyWith(color: muted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),

              // Delete button
              if (onDelete != null) ...[
                const SizedBox(width: AppSpacing.xs),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  color: AppColors.expense,
                  iconSize: 20,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 40,
                    minHeight: 40,
                  ),
                  onPressed: onDelete,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
