import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

class AIInsightCard extends StatelessWidget {
  final String title;
  final String body;
  final IconData leadingIcon;
  final List<Widget> actions;

  const AIInsightCard({
    super.key,
    this.title = 'AI Insight',
    required this.body,
    this.leadingIcon = Icons.auto_awesome_rounded,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    return Container(
      decoration: BoxDecoration(
        color: primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: primary.withValues(alpha: 0.18), width: 0.8),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(AppRadii.md),
                ),
                child: Icon(leadingIcon, size: 17, color: primary),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                title,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            body,
            style: theme.textTheme.bodyMedium?.copyWith(
              height: 1.5,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.78),
            ),
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
