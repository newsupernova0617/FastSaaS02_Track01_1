import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] prompt_chip.dart
// Pill-shaped chip used for quick actions & suggested prompts.
// Haptic feedback on tap. Variant: "brand" (gradient fill) or "ghost" (outline).
// ============================================================

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
            gradient: isBrand ? AppGradients.brand : null,
            color: isBrand ? null : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(AppRadii.pill),
            border: isBrand
                ? null
                : Border.all(color: theme.colorScheme.outline, width: 0.5),
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
                    color: isBrand ? Colors.white : theme.colorScheme.onSurface,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                ],
                Text(
                  label,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: isBrand ? Colors.white : theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
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
