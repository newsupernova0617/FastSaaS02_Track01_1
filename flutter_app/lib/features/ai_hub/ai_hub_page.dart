import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';

class AiHubPage extends ConsumerStatefulWidget {
  const AiHubPage({super.key});

  @override
  ConsumerState<AiHubPage> createState() => _AiHubPageState();
}

class _AiHubPageState extends ConsumerState<AiHubPage> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI 기능'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/home'),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children:
              [
                    Container(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          decoration: BoxDecoration(
                            gradient: AppGradients.brand,
                            borderRadius: BorderRadius.circular(AppRadii.xl),
                            boxShadow: AppGlow.hero(),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.md,
                                  vertical: AppSpacing.sm,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.16),
                                  borderRadius: BorderRadius.circular(
                                    AppRadii.pill,
                                  ),
                                ),
                                child: const Text(
                                  '말로 기록하는 AI 가계부',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.lg),
                              Text(
                                '검색, 기록, 리포트를\n한 곳에서 실행하세요',
                                style: theme.textTheme.headlineMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  height: 1.15,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                '랜딩페이지의 데모 기능을 실제 데이터와 연결한 AI 작업 허브입니다.',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Colors.white.withValues(alpha: 0.78),
                                ),
                              ),
                            ],
                          ),
                        )
                        .animate()
                        .fadeIn(duration: 320.ms)
                        .slideY(begin: 0.06, end: 0),
                    const SizedBox(height: AppSpacing.xl),
                    _FeatureTile(
                      icon: Icons.chat_bubble_outline_rounded,
                      title: 'AI 채팅',
                      description: '기록, 수정, 삭제, 검색을 대화로 처리합니다.',
                      actionLabel: '대화 시작',
                      onTap: () => context.push('/chat'),
                    ),
                    _FeatureTile(
                      icon: Icons.manage_search_rounded,
                      title: 'AI 검색',
                      description: '“지난달 식비”처럼 채팅 안에서 거래를 찾습니다.',
                      actionLabel: '채팅으로',
                      onTap: () => context.push('/chat'),
                    ),
                    _FeatureTile(
                      icon: Icons.edit_note_rounded,
                      title: '맞춤 리포트',
                      description: '“이번 달 식비 리포트”처럼 조건을 지정해 생성합니다.',
                      actionLabel: '채팅으로',
                      onTap: () => context.push('/chat'),
                    ),
                    _FeatureTile(
                      icon: Icons.calendar_view_month_rounded,
                      title: '정기 리포트',
                      description: '주간/월간 리포트를 확인하고 자동 생성을 관리합니다.',
                      actionLabel: '관리',
                      onTap: () => context.push('/monthly-report'),
                    ),
                  ]
                  .animate(interval: 70.ms)
                  .fadeIn(duration: 280.ms)
                  .slideY(begin: 0.04, end: 0),
        ),
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String actionLabel;
  final VoidCallback? onTap;

  const _FeatureTile({
    required this.icon,
    required this.title,
    required this.description,
    required this.actionLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: GlassCard(
        padding: const EdgeInsets.all(AppSpacing.lg),
        onTap: onTap,
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(AppRadii.md),
              ),
              child: Icon(icon, color: AppColors.primary),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: theme.textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(description, style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              actionLabel,
              style: theme.textTheme.labelLarge?.copyWith(
                color: onTap == null
                    ? theme.colorScheme.onSurface.withValues(alpha: 0.4)
                    : AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
