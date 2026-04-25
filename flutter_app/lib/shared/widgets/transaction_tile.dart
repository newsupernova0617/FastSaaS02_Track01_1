import 'package:flutter/material.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/widgets/category_icon_badge.dart';

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

  String _formatCurrency(num value) {
    return '₩${value.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
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
              CategoryIconBadge(
                category: transaction.category,
                color: accent,
                size: 48,
                iconSize: 20,
                borderRadius: AppRadii.md,
              ),
              const SizedBox(width: AppSpacing.md),
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
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: muted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
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
