import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] animated_count_text.dart
// Animates a numeric value from `from` → `to` over the given duration.
// Use in hero cards to draw attention to monthly totals.
// ============================================================

typedef NumberFormatter = String Function(double value);

class AnimatedCountText extends StatefulWidget {
  final double from;
  final double to;
  final Duration duration;
  final Curve curve;
  final NumberFormatter formatter;
  final Widget Function(BuildContext, String) builder;

  const AnimatedCountText({
    super.key,
    this.from = 0,
    required this.to,
    this.duration = AppMotion.count,
    this.curve = AppMotion.emphasizedDecel,
    required this.formatter,
    required this.builder,
  });

  @override
  State<AnimatedCountText> createState() => _AnimatedCountTextState();
}

class _AnimatedCountTextState extends State<AnimatedCountText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _setTween();
    _controller.forward();
  }

  @override
  void didUpdateWidget(covariant AnimatedCountText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.to != widget.to || oldWidget.from != widget.from) {
      _setTween();
      _controller
        ..reset()
        ..forward();
    }
  }

  void _setTween() {
    _animation = Tween<double>(begin: widget.from, end: widget.to)
        .animate(CurvedAnimation(parent: _controller, curve: widget.curve));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, _) =>
          widget.builder(context, widget.formatter(_animation.value)),
    );
  }
}
