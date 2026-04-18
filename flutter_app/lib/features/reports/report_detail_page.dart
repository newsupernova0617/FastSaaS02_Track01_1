import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/widgets/animated_fade_slide.dart';
import 'package:flutter_app/shared/widgets/empty_state.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';
import '../../shared/models/report.dart';
import '../../shared/providers/report_provider.dart';
import '../../shared/widgets/ad_banner.dart';
import '../../shared/widgets/ad_interstitial_trigger.dart';
import '../ai_chat/widgets/report_card.dart';
import '../ai_chat/widgets/report_chart.dart';
import 'widgets/report_name_dialog.dart';

// ============================================================
// [리포트 상세 화면] report_detail_page.dart
// AI가 생성한 리포트의 전체 내용을 보여주는 화면.
// 진입 경로:
//   1) 채팅 직후 → "저장하기"
//   2) 통계 탭에서 클릭 → "삭제하기" + "닫기"
// ============================================================
class ReportDetailPage extends ConsumerStatefulWidget {
  final int reportId;
  final bool isFromStats;

  const ReportDetailPage({
    super.key,
    required this.reportId,
    this.isFromStats = false,
  });

  @override
  ConsumerState<ReportDetailPage> createState() => _ReportDetailPageState();
}

class _ReportDetailPageState extends ConsumerState<ReportDetailPage> {
  bool _isSaving = false;
  bool _isDeleting = false;

  @override
  void initState() {
    super.initState();
    // Show interstitial ad on report generation complete (Free users only,
    // silently skipped if no ad is cached). Deferred to post-frame so the
    // report UI renders first.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      AdInterstitialTrigger.showIfFree(ref);
    });
  }

  Widget _buildSection(Map<String, dynamic> section) {
    final type = section['type'] as String? ?? 'card';
    switch (type) {
      case 'pie':
      case 'bar':
      case 'line':
        return ReportChart(section: section);
      default:
        return ReportCard(section: section);
    }
  }

  Future<void> _handleSaveReport(
    ReportDetail report, {
    String? customTitle,
  }) async {
    setState(() => _isSaving = true);

    try {
      final reportData = Report(
        reportType: report.reportType,
        title: customTitle ?? report.title,
        subtitle: report.subtitle,
        reportData: report.reportData,
        params: report.params,
      );

      await ref.read(saveReportProvider(reportData).future);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('리포트가 저장되었습니다')),
      );
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/chat');
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('저장 실패: $e')),
      );
      setState(() => _isSaving = false);
    }
  }

  void _showSaveDialog(ReportDetail report) {
    showDialog(
      context: context,
      builder: (context) => ReportNameDialog(
        initialName: report.title,
        onSave: (String newTitle) =>
            _handleSaveReport(report, customTitle: newTitle),
      ),
    );
  }

  Future<void> _handleDeleteReport() async {
    final theme = Theme.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('리포트 삭제'),
        content: const Text('이 리포트를 삭제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              '삭제',
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      await ref.read(deleteReportProvider(widget.reportId).future);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('리포트가 삭제되었습니다')),
      );
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/stats');
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('삭제 실패: $e')),
      );
      setState(() => _isDeleting = false);
    }
  }

  void _editTitle(ReportDetail report) {
    showDialog(
      context: context,
      builder: (context) => ReportNameDialog(
        initialName: report.title,
        title: '리포트 이름 변경',
        onSave: (newTitle) async {
          try {
            await ref.read(
              updateReportProvider((widget.reportId, newTitle)).future,
            );
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('리포트 이름이 변경되었습니다')),
            );
          } catch (e) {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('변경 실패: $e')),
            );
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reportAsync = ref.watch(getReportDetailProvider(widget.reportId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('리포트'),
      ),
      body: Column(
        children: [
          Expanded(
            child: reportAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => EmptyState(
                icon: Icons.error_outline,
                title: '리포트를 불러오지 못했습니다',
                subtitle: error.toString(),
                actionLabel: '재시도',
                onAction: () =>
                    ref.invalidate(getReportDetailProvider(widget.reportId)),
              ),
              data: (report) => CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: AnimatedFadeSlide(
                      child: _buildHeader(theme, report),
                    ),
                  ),
                  if (report.reportData.isNotEmpty)
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final section = report.reportData[index];
                          return AnimatedFadeSlide(
                            delay: Duration(milliseconds: 80 + 60 * index),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.lg,
                                vertical: AppSpacing.sm,
                              ),
                              child: _buildSection(section),
                            ),
                          );
                        },
                        childCount: report.reportData.length,
                      ),
                    ),
                  const SliverPadding(
                    padding: EdgeInsets.only(bottom: AppSpacing.xxl),
                  ),
                ],
              ),
            ),
          ),
          const AdBanner(),
        ],
      ),
      bottomNavigationBar: reportAsync.whenData(_buildBottomBar).value,
    );
  }

  Widget _buildHeader(ThemeData theme, ReportDetail report) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: GlassCard(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.auto_graph,
                  color: theme.colorScheme.primary,
                  size: 22,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: InkWell(
                    onTap: widget.isFromStats ? () => _editTitle(report) : null,
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                    child: Padding(
                      padding:
                          const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              report.title,
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          if (widget.isFromStats) ...[
                            const SizedBox(width: AppSpacing.xs),
                            Icon(
                              Icons.edit_outlined,
                              size: 16,
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.45),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (report.subtitle != null && report.subtitle!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                report.subtitle!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                  height: 1.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(ReportDetail report) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.4),
            width: 0.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: widget.isFromStats
              ? Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 52,
                        child: OutlinedButton.icon(
                          onPressed: _isDeleting ? null : _handleDeleteReport,
                          icon: const Icon(Icons.delete_outline_rounded,
                              size: 18, color: AppColors.expense),
                          label: Text(
                            _isDeleting ? '삭제 중…' : '삭제',
                            style: const TextStyle(
                              color: AppColors.expense,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(
                              color: AppColors.expense.withValues(alpha: 0.5),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadii.lg),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: SizedBox(
                        height: 52,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: AppGradients.brand,
                            borderRadius: BorderRadius.circular(AppRadii.lg),
                            boxShadow: AppGlow.small(),
                          ),
                          child: ElevatedButton(
                            onPressed: () => context.go('/stats'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(AppRadii.lg),
                              ),
                            ),
                            child: const Text(
                              '닫기',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                )
              : Row(
                  children: [
                    // 저장 없이 바로 나가기
                    SizedBox(
                      height: 56,
                      child: OutlinedButton.icon(
                        onPressed: _isSaving
                            ? null
                            : () =>
                                context.canPop() ? context.pop() : context.go('/chat'),
                        icon: const Icon(Icons.close_rounded, size: 18),
                        label: const Text(
                          '닫기',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor:
                              theme.colorScheme.onSurface.withValues(alpha: 0.85),
                          backgroundColor: theme.colorScheme
                              .surfaceContainerHighest
                              .withValues(alpha: 0.4),
                          side: BorderSide(
                            color: theme.colorScheme.outline,
                            width: 1.2,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadii.lg),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.lg,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    // 주 CTA: 저장
                    Expanded(
                      child: SizedBox(
                        height: 56,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: AppGradients.brand,
                            borderRadius: BorderRadius.circular(AppRadii.lg),
                            boxShadow: AppGlow.medium(),
                          ),
                          child: ElevatedButton.icon(
                            onPressed: _isSaving
                                ? null
                                : () => _showSaveDialog(report),
                            icon: _isSaving
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                          Colors.white),
                                    ),
                                  )
                                : const Icon(Icons.bookmark_add_rounded,
                                    color: Colors.white),
                            label: Text(
                              _isSaving ? '저장 중…' : '리포트 저장하기',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(AppRadii.lg),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
