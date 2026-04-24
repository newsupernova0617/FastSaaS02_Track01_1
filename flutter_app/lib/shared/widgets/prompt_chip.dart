import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

enum PromptChipVariant { brand, ghost }

class PromptChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  final PromptChipVariant variant;

  const PromptChip({
    super.key,
    required this.label,
    this.icon,
    this.onTap,
    this.variant = PromptChipVariant.ghost,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isBrand = variant == PromptChipVariant.brand;

    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.pill),
        onTap: onTap == null
            ? null
            : () {
                HapticFeedback.selectionClick();
                onTap!();
              },
        child: Ink(
          decoration: BoxDecoration(
            color: isBrand ? AppColors.primary : theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadii.pill),
            border: Border.all(
              color: isBrand ? AppColors.primary : theme.colorScheme.outline,
              width: 0.8,
            ),
            boxShadow: isBrand ? AppGlow.small() : null,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm + 2,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(
                    icon,
                    size: 16,
                    color: isBrand
                        ? Colors.white
                        : theme.colorScheme.onSurface.withValues(alpha: 0.72),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                ],
                Text(
                  label,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: isBrand ? Colors.white : theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
