import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

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
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        gradient: AppGradients.heroCard(),
        borderRadius: BorderRadius.circular(AppRadii.xl),
        boxShadow: showGlow ? AppGlow.medium() : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadii.xl),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}
