import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] ai_fab.dart
// Center FAB used in the GlowNavBar. A gradient sphere with a soft
// pulsing halo to signal "AI is here" without being distracting.
// ============================================================

class AiFab extends StatelessWidget {
  final VoidCallback onTap;
  final double size;

  const AiFab({
    super.key,
    required this.onTap,
    this.size = 56,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'AI assistant',
      child: GestureDetector(
        onTap: () {
          HapticFeedback.mediumImpact();
          onTap();
        },
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Outer pulse halo
            Container(
              width: size + 16,
              height: size + 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.35),
                  width: 1,
                ),
              ),
            )
                .animate(onPlay: (c) => c.repeat())
                .fadeIn(duration: 800.ms)
                .fadeOut(delay: 400.ms, duration: 1100.ms)
                .scale(
                  begin: const Offset(0.85, 0.85),
                  end: const Offset(1.15, 1.15),
                  duration: 1500.ms,
                  curve: Curves.easeInOut,
                ),

            // Core gradient sphere
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppGradients.brand,
                boxShadow: AppGlow.medium(),
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: Colors.white,
                size: 24,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
