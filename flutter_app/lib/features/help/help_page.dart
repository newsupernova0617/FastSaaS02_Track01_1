import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/core/constants/app_constants.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';
import 'package:flutter_app/shared/widgets/section_header.dart';

class HelpPage extends StatelessWidget {
  const HelpPage({super.key});

  static const _quickStartItems =
      <({IconData icon, String title, String body})>[
        (
          icon: Icons.edit_note_rounded,
          title: '거래 기록하기',
          body: '홈이나 캘린더에서 기록 버튼을 눌러 금액, 날짜, 카테고리를 입력하세요.',
        ),
        (
          icon: Icons.auto_awesome_rounded,
          title: 'AI로 빠르게 입력하기',
          body: '"점심 12000원"처럼 자연어로 입력하면 AI가 거래 정보를 정리합니다.',
        ),
        (
          icon: Icons.bar_chart_rounded,
          title: '통계와 리포트 보기',
          body: '월별 지출, 카테고리 비중, AI 리포트를 통해 소비 패턴을 확인하세요.',
        ),
      ];

  static const _faqItems = <({String question, String answer})>[
    (
      question: 'AI가 거래를 어떻게 해석하나요?',
      answer:
          '입력한 문장에서 금액, 날짜, 카테고리 후보를 추출해 거래 형태로 정리합니다. 저장 전에 내용을 다시 확인하는 것이 좋습니다.',
    ),
    (
      question: '카테고리를 잘못 선택했어요.',
      answer: '거래 상세나 수정 화면에서 카테고리를 다시 선택하면 됩니다. 통계와 리포트는 수정된 값을 기준으로 반영됩니다.',
    ),
    (
      question: '리포트는 언제 생성되나요?',
      answer: '주간 또는 월간 조건에 맞는 거래가 있으면 생성되며, 홈과 리포트 화면에서 다시 열어볼 수 있습니다.',
    ),
    (
      question: '데이터가 안 보이거나 늦게 갱신돼요.',
      answer: '네트워크 상태를 확인한 뒤 화면을 다시 열어보세요. 문제가 반복되면 문의하기 화면에서 상세 내용을 남겨주세요.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('도움말')),
      body: ListView(
        padding: const EdgeInsets.only(
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          top: AppSpacing.lg,
          bottom: AppSpacing.xl,
        ),
        children: [
          GlassCard(
            overlayIcon: const Icon(Icons.support_agent_rounded),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${AppConstants.appName} 사용 가이드',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '거래 기록, AI 입력, 통계와 리포트까지 자주 찾는 기능을 한 곳에 정리했습니다.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.68),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: const [
                    _HelpChip(icon: Icons.receipt_long_rounded, label: '거래 기록'),
                    _HelpChip(icon: Icons.auto_awesome_rounded, label: 'AI 입력'),
                    _HelpChip(icon: Icons.insights_rounded, label: '리포트'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          const SectionHeader(
            title: '빠른 시작',
            leadingIcon: Icons.flash_on_rounded,
          ),
          const SizedBox(height: AppSpacing.md),
          for (final item in _quickStartItems) ...[
            _HelpStepCard(icon: item.icon, title: item.title, body: item.body),
            const SizedBox(height: AppSpacing.sm),
          ],
          const SizedBox(height: AppSpacing.lg),
          const SectionHeader(
            title: '자주 묻는 질문',
            leadingIcon: Icons.quiz_rounded,
          ),
          const SizedBox(height: AppSpacing.md),
          GlassCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < _faqItems.length; i++) ...[
                  _FaqTile(
                    question: _faqItems[i].question,
                    answer: _faqItems[i].answer,
                  ),
                  if (i != _faqItems.length - 1)
                    Divider(
                      height: 1,
                      color: theme.colorScheme.outline.withValues(alpha: 0.35),
                    ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const SectionHeader(title: '추가 안내', leadingIcon: Icons.link_rounded),
          const SizedBox(height: AppSpacing.md),
          GlassCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _LinkTile(
                  icon: Icons.privacy_tip_outlined,
                  title: '개인정보 처리방침',
                  subtitle: '설정 화면에서도 같은 항목을 열 수 있습니다.',
                  onTap: () => ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(const SnackBar(content: Text('준비 중입니다.'))),
                ),
                Divider(
                  height: 1,
                  color: theme.colorScheme.outline.withValues(alpha: 0.35),
                ),
                _LinkTile(
                  icon: Icons.mail_outline_rounded,
                  title: '문의하기로 이동',
                  subtitle: '버그 신고, 기능 제안, 계정 문의는 별도 문의 페이지에서 접수합니다.',
                  onTap: () => context.push('/contact'),
                ),
                Divider(
                  height: 1,
                  color: theme.colorScheme.outline.withValues(alpha: 0.35),
                ),
                _LinkTile(
                  icon: Icons.settings_suggest_rounded,
                  title: '설정으로 돌아가기',
                  subtitle: '테마, AI 기능, 계정 관련 옵션을 다시 확인합니다.',
                  onTap: () => context.pop(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HelpChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _HelpChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(
          alpha: 0.55,
        ),
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: AppSpacing.sm),
          Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HelpStepCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;

  const _HelpStepCard({
    required this.icon,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            alignment: Alignment.center,
            child: Icon(icon, color: theme.colorScheme.primary),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.68),
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  final String question;
  final String answer;

  const _FaqTile({required this.question, required this.answer});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Theme(
      data: theme.copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        childrenPadding: const EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          bottom: AppSpacing.md,
        ),
        iconColor: theme.colorScheme.primary,
        collapsedIconColor: theme.colorScheme.onSurface.withValues(alpha: 0.5),
        title: Text(
          question,
          style: theme.textTheme.bodyLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              answer,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.68),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LinkTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _LinkTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: theme.colorScheme.primary.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(AppRadii.md),
        ),
        alignment: Alignment.center,
        child: Icon(icon, size: 18, color: theme.colorScheme.primary),
      ),
      title: Text(
        title,
        style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
      subtitle: Text(
        subtitle,
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.62),
        ),
      ),
      trailing: Icon(
        Icons.arrow_forward_ios_rounded,
        size: 14,
        color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
      ),
      onTap: onTap,
    );
  }
}
