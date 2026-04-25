import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// Center AI entry point styled like the landing page primary CTA.
class AiFab extends StatelessWidget {
  final VoidCallback onTap;
  final double size;

  const AiFab({super.key, required this.onTap, this.size = 56});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'AI 도우미 열기',
      child: GestureDetector(
        onTap: () {
          HapticFeedback.mediumImpact();
          onTap();
        },
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppGradients.brand,
            boxShadow: AppGlow.medium(),
          ),
          child: const Icon(
            Icons.auto_awesome_rounded,
            color: Colors.white,
            size: 24,
          ),
        ),
      ),
    );
  }
}
