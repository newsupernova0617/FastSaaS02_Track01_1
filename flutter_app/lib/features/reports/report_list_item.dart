import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import '../../shared/models/report.dart';
import '../../shared/models/report_type.dart';

// ============================================================
// [Phase 3] report_list_item.dart
// Futuristic AI 리스킨 — 그라디언트 아이콘 + glass 카드 + 타입별 액센트.
// stats_page 리포트 탭에서 사용.
// ============================================================
class ReportListItem extends StatelessWidget {
  final ReportSummary report;

  const ReportListItem({super.key, required this.report});

  String _formatDate(String isoDate) {
    try {
      return DateFormat('yyyy.MM.dd').format(DateTime.parse(isoDate));
    } catch (_) {
      return isoDate;
    }
  }

  String _typeLabel(String raw) =>
      ReportType.fromString(raw)?.label ?? raw;

  IconData _typeIcon(String raw) {
    final type = ReportType.fromString(raw);
    switch (type) {
      case ReportType.monthly_summary:
        return Icons.calendar_view_month_rounded;
      case ReportType.category_detail:
        return Icons.donut_small_rounded;
      case ReportType.spending_pattern:
        return Icons.insights_rounded;
      case ReportType.anomaly:
        return Icons.warning_amber_rounded;
      case ReportType.suggestion:
        return Icons.lightbulb_rounded;
      case null:
        return Icons.auto_awesome_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final icon = _typeIcon(report.reportType);
    final subtitle = report.subtitle;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.card),
        onTap: () {
          HapticFeedback.selectionClick();
          context.push('/report/${report.id}', extra: {'isFromStats': true});
        },
        child: Container(
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadii.card),
            border: Border.all(
              color: theme.colorScheme.outline.withValues(alpha: 0.4),
              width: 0.5,
            ),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.md,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Gradient icon badge
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  gradient: AppGradients.brand,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  boxShadow: AppGlow.small(),
                ),
                child: Icon(icon, size: 20, color: Colors.white),
              ),
              const SizedBox(width: AppSpacing.md),

              // Title + meta
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      report.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subtitle != null && subtitle.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        _TypeChip(label: _typeLabel(report.reportType)),
                        const SizedBox(width: AppSpacing.sm),
                        Icon(
                          Icons.schedule_rounded,
                          size: 12,
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.45),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatDate(report.createdAt),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.55),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(width: AppSpacing.sm),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 14,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  const _TypeChip({required this.label});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.35),
          width: 0.5,
        ),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
