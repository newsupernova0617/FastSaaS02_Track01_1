import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

class AiLoadingStatus extends StatefulWidget {
  final String? prompt;
  final bool dense;

  const AiLoadingStatus({super.key, this.prompt, this.dense = false});

  @override
  State<AiLoadingStatus> createState() => _AiLoadingStatusState();
}

class _AiLoadingStatusState extends State<AiLoadingStatus> {
  static const _steps = [
    _AiLoadingStep(label: '질문 이해', description: '요청 의도와 최근 대화 흐름을 파악하고 있어요.'),
    _AiLoadingStep(label: '데이터 확인', description: '관련 거래와 기록을 불러와서 확인하고 있어요.'),
    _AiLoadingStep(label: '답변 정리', description: '바로 읽기 쉬운 답변으로 정리하고 있어요.'),
  ];

  Timer? _timer;
  int _stepIndex = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 2200), (_) {
      if (!mounted) return;
      setState(() => _stepIndex = (_stepIndex + 1) % _steps.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final step = _steps[_stepIndex];
    final prompt = widget.prompt?.trim();
    final title = prompt == null || prompt.isEmpty
        ? 'AI가 답변을 준비하고 있어요'
        : '"$prompt" 답변을 준비하고 있어요';

    return AnimatedSwitcher(
      duration: AppMotion.medium,
      switchInCurve: AppMotion.emphasized,
      switchOutCurve: AppMotion.emphasized,
      child: DecoratedBox(
        key: ValueKey('${widget.dense}-${_stepIndex}-$prompt'),
        decoration: BoxDecoration(
          gradient: AppGradients.brandSoft,
          borderRadius: BorderRadius.circular(
            widget.dense ? AppRadii.lg : AppRadii.card,
          ),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.12),
            width: 1,
          ),
          boxShadow: AppGlow.small(color: AppColors.primarySoft),
        ),
        child: Padding(
          padding: EdgeInsets.all(widget.dense ? AppSpacing.md : AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                        width: widget.dense ? 34 : 40,
                        height: widget.dense ? 34 : 40,
                        decoration: BoxDecoration(
                          gradient: AppGradients.brand,
                          borderRadius: BorderRadius.circular(AppRadii.md),
                          boxShadow: AppGlow.small(),
                        ),
                        child: const Icon(
                          Icons.auto_awesome_rounded,
                          color: Colors.white,
                          size: 18,
                        ),
                      )
                      .animate(onPlay: (controller) => controller.repeat())
                      .shimmer(
                        duration: 1300.ms,
                        color: Colors.white.withValues(alpha: 0.18),
                      ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: widget.dense ? 1 : 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          step.description,
                          maxLines: widget.dense ? 1 : 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.68,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadii.pill),
                child: LinearProgressIndicator(
                  minHeight: widget.dense ? 6 : 7,
                  backgroundColor: Colors.white.withValues(alpha: 0.65),
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: List.generate(_steps.length, (index) {
                  final active = index == _stepIndex;
                  return AnimatedContainer(
                    duration: AppMotion.medium,
                    curve: AppMotion.emphasized,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm + 2,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: active
                          ? AppColors.primary.withValues(alpha: 0.12)
                          : Colors.white.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                      border: Border.all(
                        color: active
                            ? AppColors.primary.withValues(alpha: 0.24)
                            : theme.colorScheme.outline.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Text(
                      _steps[index].label,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: active
                            ? AppColors.primary
                            : theme.colorScheme.onSurface.withValues(
                                alpha: 0.55,
                              ),
                      ),
                    ),
                  );
                }),
              ),
              if (!widget.dense) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '응답이 길거나 데이터 확인이 많으면 몇 초 더 걸릴 수 있어요.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _AiLoadingStep {
  final String label;
  final String description;

  const _AiLoadingStep({required this.label, required this.description});
}
