import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [공유 위젯] glass_card.dart
// mitesh77 fitness_app `glass_view.dart`에서 영감 받은 글래스모피즘 카드.
// 배경에 연한 그라데이션 + 부드러운 쉐도우 + 둥근 모서리.
// 테마 인지: 라이트/다크 모두 적절한 투명도로 렌더.
//
// 특징:
//   - 왼쪽에 컬러 accentBar(옵션) — 수입/지출/워닝 등 의미 표시
//   - 오른쪽 상단에 overlayIcon(옵션) — 아이콘 강조
//   - 기본 패딩 16dp, 둥근 모서리 16dp
// ============================================================
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
    final isDark = theme.brightness == Brightness.dark;

    final baseColor = theme.colorScheme.surface;
    final accent = accentColor ?? theme.colorScheme.primary;

    final gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Color.alphaBlend(accent.withValues(alpha: isDark ? 0.10 : 0.06), baseColor),
        baseColor,
      ],
    );

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
                gradient: gradient,
                borderRadius: BorderRadius.circular(AppRadii.card),
                border: Border.all(
                  color: theme.colorScheme.outline.withValues(alpha: isDark ? 0.40 : 0.25),
                  width: 0.5,
                ),
                boxShadow: isDark
                    ? null
                    : [
                        BoxShadow(
                          color: accent.withValues(alpha: 0.08),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
              ),
              child: Padding(
                padding: padding,
                child: child,
              ),
            ),
          ),
        ),
        if (overlayIcon != null)
          Positioned(
            top: -12,
            right: AppSpacing.lg,
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: accent,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: accent.withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: IconTheme(
                data: const IconThemeData(color: Colors.white, size: 24),
                child: Center(child: overlayIcon!),
              ),
            ),
          ),
      ],
    );
  }
}
