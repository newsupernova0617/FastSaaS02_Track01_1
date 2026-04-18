import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/onboarding_provider.dart';

// ============================================================
// [Phase 3] onboarding_page.dart
// Native-rendered 4-slide intro. No PNG assets — gradient mesh
// background + FontAwesome mark + animated pill indicator.
// ============================================================

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
      title: '대화로 기록하는 가계부',
      subtitle: '"어제 점심 만원 썼어" 한 마디면\nAI가 카테고리·금액·날짜를 자동으로 분류해요.',
    ),
    _Slide(
      icon: FontAwesomeIcons.chartLine,
      title: '한눈에 보는 소비 패턴',
      subtitle: '월별 대시보드·카테고리 분석·AI 리포트로\n내 돈이 어디로 가는지 명확해집니다.',
    ),
    _Slide(
      icon: FontAwesomeIcons.lightbulb,
      title: 'AI가 읽어주는 내 소비',
      subtitle: '패턴의 변화와 이상 신호를\nAI가 먼저 알려드려요.',
    ),
    _Slide(
      icon: FontAwesomeIcons.rocket,
      title: '준비 완료',
      subtitle: '이제 첫 지출을 기록해 볼까요?',
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
      backgroundColor: AppColors.darkBackground,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background gradient blobs — shift on page change
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 800),
            child: _BackgroundField(key: ValueKey(_index), index: _index),
          ),

          SafeArea(
            child: Column(
              children: [
                // Skip
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: TextButton(
                      onPressed: _finish,
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white.withValues(alpha: 0.7),
                      ),
                      child: Text(
                        isLast ? '' : '건너뛰기',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
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

                // Indicator
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_pages.length, (i) {
                      final active = i == _index;
                      return AnimatedContainer(
                        duration: AppMotion.medium,
                        curve: AppMotion.emphasized,
                        margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                        width: active ? 28 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          gradient: active ? AppGradients.brand : null,
                          color: active
                              ? null
                              : Colors.white.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(AppRadii.pill),
                          boxShadow: active ? AppGlow.small() : null,
                        ),
                      );
                    }),
                  ),
                ),

                // Continue button
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    AppSpacing.xl,
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    height: 58,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: AppGradients.brand,
                        borderRadius: BorderRadius.circular(AppRadii.lg),
                        boxShadow: AppGlow.medium(),
                      ),
                      child: ElevatedButton(
                        onPressed: _next,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadii.lg),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              isLast ? '시작하기' : '다음',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.arrow_forward_rounded,
                                color: Colors.white, size: 20),
                          ],
                        ),
                      ),
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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Gradient ring with icon — animates on enter
          Container(
            width: 160,
            height: 160,
            decoration: BoxDecoration(
              gradient: AppGradients.brand,
              shape: BoxShape.circle,
              boxShadow: AppGlow.hero(),
            ),
            child: Center(
              child: Container(
                width: 132,
                height: 132,
                decoration: BoxDecoration(
                  color: AppColors.darkBackground,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: FaIcon(
                    slide.icon,
                    size: 56,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          )
              .animate(target: isActive ? 1 : 0)
              .scaleXY(begin: 0.92, end: 1.0, duration: 400.ms, curve: AppMotion.emphasized)
              .fadeIn(duration: 300.ms),

          const SizedBox(height: AppSpacing.xxl),

          Text(
            slide.title,
            style: theme.textTheme.headlineMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
            textAlign: TextAlign.center,
          )
              .animate(target: isActive ? 1 : 0)
              .fadeIn(delay: 100.ms, duration: 400.ms)
              .slideY(begin: 0.1, end: 0, curve: AppMotion.emphasizedDecel),

          const SizedBox(height: AppSpacing.md),

          Text(
            slide.subtitle,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.white.withValues(alpha: 0.65),
              height: 1.55,
            ),
            textAlign: TextAlign.center,
          )
              .animate(target: isActive ? 1 : 0)
              .fadeIn(delay: 200.ms, duration: 400.ms)
              .slideY(begin: 0.1, end: 0, curve: AppMotion.emphasizedDecel),
        ],
      ),
    );
  }
}

class _BackgroundField extends StatelessWidget {
  final int index;
  const _BackgroundField({super.key, required this.index});

  @override
  Widget build(BuildContext context) {
    // Each slide nudges the blob positions for variety
    final positions = [
      (const Alignment(-0.8, -0.6), const Alignment(0.9, 0.8)),
      (const Alignment(-0.3, -1.0), const Alignment(1.0, 0.2)),
      (const Alignment(-1.0, 0.2), const Alignment(0.5, 1.0)),
      (const Alignment(0.0, -0.5), const Alignment(0.0, 1.0)),
    ];
    final (violetAlign, cyanAlign) = positions[index % positions.length];

    return Stack(
      fit: StackFit.expand,
      children: [
        Container(color: AppColors.darkBackground),
        Align(
          alignment: violetAlign,
          child: Container(
            width: 520,
            height: 520,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppGradients.violetBlob,
            ),
          ),
        ),
        Align(
          alignment: cyanAlign,
          child: Container(
            width: 440,
            height: 440,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppGradients.cyanBlob,
            ),
          ),
        ),
        // Fog
        Container(color: Colors.black.withValues(alpha: 0.35)),
      ],
    );
  }
}
