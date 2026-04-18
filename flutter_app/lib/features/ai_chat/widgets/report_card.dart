import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] report_card.dart
// AI 응답·리포트 상세에서 카드형 섹션 렌더.
// Dark-first 테마 + 타입별 액센트 색상(gradient/warning/primary)으로
// glass 스타일 카드를 출력한다.
//
// 섹션 타입:
//   'card'       → 메트릭 카드 (제목, 수치, 추세)
//   'alert'      → 경고 카드 (amber warning accent)
//   'suggestion' → 제안 카드 (violet brand accent)
// ============================================================
class ReportCard extends StatelessWidget {
  final Map<String, dynamic> section;

  const ReportCard({super.key, required this.section});

  @override
  Widget build(BuildContext context) {
    final sectionType = section['type'] as String? ?? 'card';
    final title = section['title'] as String?;
    final subtitle = section['subtitle'] as String?;
    final metric = section['metric'] as String?;
    final trend = section['trend'] as String?;
    final dataMap = section['data'] as Map<String, dynamic>?;
    final message = dataMap?['message'] as String?;

    switch (sectionType) {
      case 'card':
        return _buildCardSection(context, title, subtitle, metric, trend);
      case 'alert':
        return _buildAccentSection(
          context,
          icon: Icons.warning_rounded,
          title: title,
          message: message,
          accent: AppColors.warning,
        );
      case 'suggestion':
        return _buildAccentSection(
          context,
          icon: Icons.lightbulb_rounded,
          title: title,
          message: message,
          accent: AppColors.primary,
        );
      default:
        return const SizedBox.shrink();
    }
  }

  // ── Metric card with trend ─────────────────────────────────
  Widget _buildCardSection(
    BuildContext context,
    String? title,
    String? subtitle,
    String? metric,
    String? trend,
  ) {
    final theme = Theme.of(context);

    IconData? trendIcon;
    Color trendColor = theme.colorScheme.onSurface.withValues(alpha: 0.5);
    if (trend != null) {
      switch (trend.toLowerCase()) {
        case 'up':
          trendIcon = Icons.trending_up_rounded;
          trendColor = AppColors.expense;
          break;
        case 'down':
          trendIcon = Icons.trending_down_rounded;
          trendColor = AppColors.income;
          break;
        case 'stable':
          trendIcon = Icons.trending_flat_rounded;
          trendColor = AppColors.warning;
          break;
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.4),
          width: 0.5,
        ),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Gradient accent bar
          Container(
            width: 4,
            height: 48,
            decoration: BoxDecoration(
              gradient: AppGradients.brand,
              borderRadius: BorderRadius.circular(AppRadii.pill),
              boxShadow: AppGlow.small(),
            ),
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
                        title ?? 'Metric',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.65),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (trendIcon != null) ...[
                      const SizedBox(width: AppSpacing.sm),
                      Icon(trendIcon, size: 18, color: trendColor),
                    ],
                  ],
                ),
                if (subtitle != null && subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.55),
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
                Text(
                  metric ?? '—',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Alert / Suggestion ─────────────────────────────────────
  Widget _buildAccentSection(
    BuildContext context, {
    required IconData icon,
    required Color accent,
    String? title,
    String? message,
  }) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: accent.withValues(alpha: 0.35), width: 0.8),
      ),
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 16, color: accent),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: accent,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                if (message != null) ...[
                  if (title != null) const SizedBox(height: 4),
                  Text(
                    message,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.85),
                      height: 1.45,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
