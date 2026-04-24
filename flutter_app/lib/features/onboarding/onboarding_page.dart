import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/onboarding_provider.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';

class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final _controller = PageController();
  int _index = 0;

  static const List<_Slide> _pages = [
    _Slide(
      icon: FontAwesomeIcons.wandMagicSparkles,
      title: '말로 기록하세요',
      subtitle: '"어제 점심 12,000원"처럼 말하면 AI가 금액, 날짜, 카테고리를 정리합니다.',
    ),
    _Slide(
      icon: FontAwesomeIcons.chartLine,
      title: '흐름을 한눈에 봅니다',
      subtitle: '월별 지출, 카테고리 변화, 소비 패턴을 카드와 차트로 빠르게 확인하세요.',
    ),
    _Slide(
      icon: FontAwesomeIcons.lightbulb,
      title: 'AI가 먼저 알려줍니다',
      subtitle: '평소와 다른 지출이나 반복되는 습관을 발견하면 간단한 인사이트로 보여줍니다.',
    ),
    _Slide(
      icon: FontAwesomeIcons.rocket,
      title: '준비 완료',
      subtitle: '첫 지출을 기록하고 랜딩페이지에서 본 그 경험을 실제 앱에서 시작하세요.',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await ref.read(onboardingCompletedProvider.notifier).markCompleted();
    if (mounted) context.go('/login');
  }

  void _next() {
    if (_index < _pages.length - 1) {
      _controller.nextPage(
        duration: AppMotion.medium,
        curve: AppMotion.emphasizedDecel,
      );
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLast = _index == _pages.length - 1;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _LandingBackground(),
          SafeArea(
            child: Column(
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: TextButton(
                      onPressed: _finish,
                      child: Text(isLast ? '' : '건너뛰기'),
                    ),
                  ),
                ),
                Expanded(
                  child: PageView.builder(
                    controller: _controller,
                    itemCount: _pages.length,
                    onPageChanged: (i) => setState(() => _index = i),
                    itemBuilder: (context, index) {
                      final slide = _pages[index];
                      final isActive = _index == index;
                      return _SlideView(slide: slide, isActive: isActive);
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_pages.length, (i) {
                      final active = i == _index;
                      return AnimatedContainer(
                        duration: AppMotion.medium,
                        curve: AppMotion.emphasized,
                        margin: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xs,
                        ),
                        width: active ? 30 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: active
                              ? AppColors.primary
                              : theme.colorScheme.onSurface.withValues(
                                  alpha: 0.14,
                                ),
                          borderRadius: BorderRadius.circular(AppRadii.pill),
                        ),
                      );
                    }),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    AppSpacing.xl,
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _next,
                      icon: Icon(
                        isLast
                            ? Icons.check_rounded
                            : Icons.arrow_forward_rounded,
                      ),
                      label: Text(isLast ? '시작하기' : '다음'),
                    ),
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

class _Slide {
  final IconData icon;
  final String title;
  final String subtitle;

  const _Slide({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}

class _SlideView extends StatelessWidget {
  final _Slide slide;
  final bool isActive;

  const _SlideView({required this.slide, required this.isActive});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Center(
        child: GlassCard(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.xxl,
            AppSpacing.xl,
            AppSpacing.xxl,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                    width: 112,
                    height: 112,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(AppRadii.xl),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.18),
                      ),
                    ),
                    child: Center(
                      child: FaIcon(
                        slide.icon,
                        size: 44,
                        color: AppColors.primary,
                      ),
                    ),
                  )
                  .animate(target: isActive ? 1 : 0)
                  .scaleXY(
                    begin: 0.94,
                    end: 1.0,
                    duration: 360.ms,
                    curve: AppMotion.emphasized,
                  )
                  .fadeIn(duration: 280.ms),
              const SizedBox(height: AppSpacing.xxl),
              Text(
                    slide.title,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                    textAlign: TextAlign.center,
                  )
                  .animate(target: isActive ? 1 : 0)
                  .fadeIn(delay: 90.ms, duration: 360.ms)
                  .slideY(
                    begin: 0.08,
                    end: 0,
                    curve: AppMotion.emphasizedDecel,
                  ),
              const SizedBox(height: AppSpacing.md),
              Text(
                    slide.subtitle,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.62,
                      ),
                      height: 1.55,
                    ),
                    textAlign: TextAlign.center,
                  )
                  .animate(target: isActive ? 1 : 0)
                  .fadeIn(delay: 160.ms, duration: 360.ms)
                  .slideY(
                    begin: 0.08,
                    end: 0,
                    curve: AppMotion.emphasizedDecel,
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LandingBackground extends StatelessWidget {
  const _LandingBackground();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Container(color: AppColors.lightBackground),
        Positioned(
          top: -100,
          left: -120,
          child: _BlurCircle(
            size: 300,
            color: AppColors.primary.withValues(alpha: 0.10),
          ),
        ),
        Positioned(
          bottom: 80,
          right: -130,
          child: _BlurCircle(
            size: 260,
            color: AppColors.secondary.withValues(alpha: 0.08),
          ),
        ),
      ],
    );
  }
}

class _BlurCircle extends StatelessWidget {
  final double size;
  final Color color;

  const _BlurCircle({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: color, blurRadius: 80, spreadRadius: 40)],
      ),
    );
  }
}
