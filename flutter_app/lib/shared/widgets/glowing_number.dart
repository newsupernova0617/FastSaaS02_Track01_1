import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class GlowingNumber extends StatelessWidget {
  final String text;
  final double fontSize;
  final FontWeight fontWeight;
  final Gradient? gradient;
  final bool glow;
  final TextAlign textAlign;

  const GlowingNumber(
    this.text, {
    super.key,
    this.fontSize = 40,
    this.fontWeight = FontWeight.w900,
    this.gradient,
    this.glow = true,
    this.textAlign = TextAlign.left,
  });

  @override
  Widget build(BuildContext context) {
    final textStyle = GoogleFonts.jetBrainsMono(
      textStyle: TextStyle(
        fontSize: fontSize,
        fontWeight: fontWeight,
        letterSpacing: -1.0,
        color: Colors.white,
      ),
    );

    if (gradient == null) {
      return Text(text, style: textStyle, textAlign: textAlign);
    }

    return ShaderMask(
      shaderCallback: (bounds) => gradient!.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      blendMode: BlendMode.srcIn,
      child: Text(text, style: textStyle, textAlign: textAlign),
    );
  }
}
