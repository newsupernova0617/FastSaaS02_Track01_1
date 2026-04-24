import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// Landing-style card. The previous glass/neon implementation is preserved in
// lib/legacy_ui for rollback.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? accentColor;
  final Widget? overlayIcon;
  final double? width;
  final double? height;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.accentColor,
    this.overlayIcon,
    this.width,
    this.height,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = accentColor ?? theme.colorScheme.primary;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadii.card),
            onTap: onTap,
            child: Container(
              width: width,
              height: height,
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(AppRadii.card),
                border: Border.all(
                  color: theme.colorScheme.outline,
                  width: 0.8,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Padding(padding: padding, child: child),
            ),
          ),
        ),
        if (overlayIcon != null)
          Positioned(
            top: -12,
            right: AppSpacing.lg,
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.10),
                shape: BoxShape.circle,
              ),
              child: IconTheme(
                data: IconThemeData(color: accent, size: 24),
                child: Center(child: overlayIcon!),
              ),
            ),
          ),
      ],
    );
  }
}
