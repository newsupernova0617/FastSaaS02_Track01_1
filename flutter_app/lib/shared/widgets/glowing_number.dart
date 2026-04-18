import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';

// ============================================================
// [Phase 3] glowing_number.dart
// Large gradient-shaded number with subtle neon glow behind.
// Uses JetBrains Mono for numerals (premium fintech feel).
// ============================================================

class GlowingNumber extends StatelessWidget {
  final String text;
  final double fontSize;
  final FontWeight fontWeight;
  final Gradient gradient;
  final bool glow;
  final TextAlign textAlign;

  const GlowingNumber(
    this.text, {
    super.key,
    this.fontSize = 40,
    this.fontWeight = FontWeight.w800,
    this.gradient = AppGradients.brand,
    this.glow = true,
    this.textAlign = TextAlign.left,
  });

  @override
  Widget build(BuildContext context) {
    final textStyle = GoogleFonts.jetBrainsMono(
      textStyle: TextStyle(
        fontSize: fontSize,
        fontWeight: fontWeight,
        letterSpacing: -0.8,
        color: Colors.white,
      ),
    );

    Widget gradientText(double opacity) => Opacity(
          opacity: opacity,
          child: ShaderMask(
            shaderCallback: (bounds) => gradient
                .createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
            blendMode: BlendMode.srcIn,
            child: Text(text, style: textStyle, textAlign: textAlign),
          ),
        );

    if (!glow) return gradientText(1.0);

    return Stack(
      alignment: Alignment.center,
      children: [
        ImageFiltered(
          imageFilter: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: gradientText(0.55),
        ),
        gradientText(1.0),
      ],
    );
  }
}
