import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] ai_insight_card.dart
// A subtle card that surfaces an AI-generated insight paired with 1-2
// action chips. Gradient hairline border + soft violet tint background.
// ============================================================

class AIInsightCard extends StatelessWidget {
  final String title;
  final String body;
  final IconData leadingIcon;
  final List<Widget> actions;

  const AIInsightCard({
    super.key,
    this.title = 'AI Insight',
    required this.body,
    this.leadingIcon = Icons.auto_awesome,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.primary.withValues(alpha: 0.08)
            : AppColors.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: isDark ? 0.35 : 0.25),
          width: 0.8,
        ),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: const BoxDecoration(
                  gradient: AppGradients.brand,
                  shape: BoxShape.circle,
                ),
                child: Icon(leadingIcon, size: 16, color: Colors.white),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                title,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            body,
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
          ),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: actions,
            ),
          ],
        ],
      ),
    );
  }
}
