import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] gradient_hero_card.dart
// Signature card used for the "this month" hero and other marquee surfaces.
// Subtle violet→cyan gradient overlay + backdrop blur + glow edge.
// ============================================================

class GradientHeroCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final double? width;
  final double? height;
  final bool showGlow;

  const GradientHeroCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.xl),
    this.onTap,
    this.width,
    this.height,
    this.showGlow = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadii.xl),
        boxShadow: showGlow ? AppGlow.medium() : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadii.xl),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Stack(
            children: [
              // Base surface
              Positioned.fill(
                child: Container(color: theme.colorScheme.surface),
              ),
              // Gradient wash
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: AppGradients.heroCard(dark: isDark),
                  ),
                ),
              ),
              // Glow edge
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadii.xl),
                      border: Border.all(
                        color:
                            AppColors.primary.withValues(alpha: isDark ? 0.35 : 0.20),
                        width: 1,
                      ),
                    ),
                  ),
                ),
              ),
              // Content
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onTap,
                  borderRadius: BorderRadius.circular(AppRadii.xl),
                  child: Padding(padding: padding, child: child),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
