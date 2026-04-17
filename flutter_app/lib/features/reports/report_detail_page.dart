import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/models/report.dart';
import '../../shared/providers/report_provider.dart';
import '../ai_chat/widgets/report_card.dart';
import '../ai_chat/widgets/report_chart.dart';
import 'widgets/report_name_dialog.dart';

// ============================================================
// [리포트 상세 화면] report_detail_page.dart
// AI가 생성한 리포트의 전체 내용을 보여주는 화면입니다.
// /report/:id 경로로 접근합니다.
//
// 두 가지 진입 경로에 따라 하단 버튼이 다름:
//   1) 채팅에서 생성 직후 → "저장하기" 버튼 (saveReportProvider)
//   2) 통계 탭에서 저장된 리포트 클릭 → "삭제하기" + "닫기" 버튼
//
// 리포트 내용은 reportData 배열의 각 섹션을 순서대로 렌더링:
//   섹션 type이 pie/bar/line → ReportChart (차트)
//   그 외 → ReportCard (카드, 알림, 제안)
//
// 리포트 제목 클릭 시 이름 변경 가능 (통계 탭에서 진입한 경우만)
// ============================================================
class ReportDetailPage extends ConsumerStatefulWidget {
  final int reportId;
  final bool isFromStats;

  const ReportDetailPage({
    Key? key,
    required this.reportId,
    this.isFromStats = false,
  }) : super(key: key);

  @override
  ConsumerState<ReportDetailPage> createState() => _ReportDetailPageState();
}

class _ReportDetailPageState extends ConsumerState<ReportDetailPage> {
  bool _isSaving = false;
  bool _isDeleting = false;

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

  void _handleSaveReport(ReportDetail report, {String? customTitle}) async {
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

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('리포트가 저장되었습니다')),
        );
        // Use post-frame callback to navigate after build completes
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            context.go('/chat');
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('저장 실패: $e')),
        );
        setState(() => _isSaving = false);
      }
    }
  }

  void _showSaveDialog(ReportDetail report) {
    showDialog(
      context: context,
      builder: (context) => ReportNameDialog(
        initialName: report.title,
        onSave: (String newTitle) {
          _handleSaveReport(report, customTitle: newTitle);
        },
      ),
    );
  }

  void _handleDeleteReport() async {
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
            child: const Text('삭제'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      await ref.read(deleteReportProvider(widget.reportId).future);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('리포트가 삭제되었습니다')),
        );
        // Use post-frame callback to navigate after build completes
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            context.go('/stats');
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('삭제 실패: $e')),
        );
        setState(() => _isDeleting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportAsync = ref.watch(getReportDetailProvider(widget.reportId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('리포트'),
      ),
      body: reportAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('오류: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(getReportDetailProvider(widget.reportId)),
                child: const Text('재시도'),
              ),
            ],
          ),
        ),
        data: (report) => CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      onTap: widget.isFromStats
                          ? () {
                              showDialog(
                                context: context,
                                builder: (context) => ReportNameDialog(
                                  initialName: report.title,
                                  title: '리포트 이름 변경',
                                  onSave: (newTitle) async {
                                    try {
                                      await ref.read(updateReportProvider((widget.reportId, newTitle)).future);
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('리포트 이름이 변경되었습니다')),
                                        );
                                      }
                                    } catch (e) {
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text('변경 실패: $e')),
                                        );
                                      }
                                    }
                                  },
                                ),
                              );
                            }
                          : null,
                      child: Text(
                        report.title,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          decoration: widget.isFromStats ? TextDecoration.underline : null,
                          decorationColor: widget.isFromStats ? Colors.grey : null,
                        ),
                      ),
                    ),
                    if (report.subtitle != null && report.subtitle!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          report.subtitle!,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (report.reportData.isNotEmpty)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final section = report.reportData[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: _buildSection(section),
                    );
                  },
                  childCount: report.reportData.length,
                ),
              ),
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverToBoxAdapter(
                child: const SizedBox.shrink(),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: reportAsync.whenData(
        (report) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: widget.isFromStats
                ? Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isDeleting ? null : _handleDeleteReport,
                          icon: const Icon(Icons.delete),
                          label: const Text('삭제하기'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => context.go('/stats'),
                          child: const Text('닫기'),
                        ),
                      ),
                    ],
                  )
                : ElevatedButton(
                    onPressed: _isSaving ? null : () => _showSaveDialog(report),
                    child: _isSaving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('저장하기'),
                  ),
          ),
        ),
      ).value,
    );
  }
}
