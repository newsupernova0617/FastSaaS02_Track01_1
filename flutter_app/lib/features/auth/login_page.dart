import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';

// ============================================================
// [Phase 3] login_page.dart
// Animated gradient mesh background (two drifting radial blobs)
// + glowing AI mark + glass OAuth buttons.
// ============================================================

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(supabaseAuthProvider);
      final redirectUrl = kIsWeb
          ? 'http://localhost:5173/auth/callback'
          : 'com.fastsaas02.app://auth/callback';

      await authService.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: redirectUrl,
      );
    } catch (e) {
      _showError('Google 로그인 실패: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleKakaoSignIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    _showError('카카오 로그인은 준비 중입니다.');
    if (mounted) setState(() => _isLoading = false);
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.expense,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
      ),
    );
    if (mounted) setState(() => _errorMessage = message);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 600;
    final horizontalPadding = isMobile ? 24.0 : 48.0;
    final contentWidth = isMobile ? double.infinity : 380.0;

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Static deep background
          Container(color: AppColors.darkBackground),

          // Drifting violet blob
          _MovingBlob(
            gradient: AppGradients.violetBlob,
            size: 540,
            startAlign: const Alignment(-1.1, -1.2),
            endAlign: const Alignment(-0.2, -0.4),
            duration: const Duration(seconds: 7),
          ),
          // Drifting cyan blob
          _MovingBlob(
            gradient: AppGradients.cyanBlob,
            size: 460,
            startAlign: const Alignment(1.2, 1.1),
            endAlign: const Alignment(0.4, 0.3),
            duration: const Duration(seconds: 9),
          ),

          // Blur veil so blobs look soft
          BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
            child: Container(color: Colors.black.withValues(alpha: 0.25)),
          ),

          // Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: horizontalPadding,
                  vertical: AppSpacing.xl,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: contentWidth),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildHero(theme),
                      const SizedBox(height: AppSpacing.xxl),
                      _buildGoogleButton(theme)
                          .animate(delay: 200.ms)
                          .fadeIn(duration: 450.ms)
                          .slideY(begin: 0.12, end: 0),
                      const SizedBox(height: AppSpacing.md),
                      _buildKakaoButton(theme)
                          .animate(delay: 300.ms)
                          .fadeIn(duration: 450.ms)
                          .slideY(begin: 0.12, end: 0),
                      const SizedBox(height: AppSpacing.xl),
                      if (_errorMessage != null)
                        _buildErrorBanner(theme)
                            .animate()
                            .fadeIn(duration: 300.ms),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHero(ThemeData theme) {
    return Column(
      children: [
        // Glowing AI mark
        Container(
          width: 104,
          height: 104,
          decoration: BoxDecoration(
            gradient: AppGradients.brand,
            borderRadius: BorderRadius.circular(AppRadii.xl),
            boxShadow: AppGlow.hero(),
          ),
          child: const Icon(
            Icons.auto_awesome,
            size: 48,
            color: Colors.white,
          ),
        )
            .animate(onPlay: (c) => c.repeat(reverse: true))
            .scaleXY(
              begin: 1.0,
              end: 1.04,
              duration: 2400.ms,
              curve: Curves.easeInOut,
            ),
        const SizedBox(height: AppSpacing.xl),
        ShaderMask(
          shaderCallback: (bounds) => AppGradients.brand.createShader(
              Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
          blendMode: BlendMode.srcIn,
          child: Text(
            'Money AI',
            style: theme.textTheme.headlineLarge?.copyWith(
              fontSize: 40,
              fontWeight: FontWeight.w900,
              letterSpacing: -1.2,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          '대화로 기록하고, AI가 읽어주는 내 소비',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: Colors.white.withValues(alpha: 0.7),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    )
        .animate()
        .fadeIn(duration: 600.ms)
        .slideY(begin: 0.08, end: 0, curve: AppMotion.emphasizedDecel);
  }

  Widget _buildGoogleButton(ThemeData theme) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadii.lg),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: SizedBox(
          width: double.infinity,
          height: 58,
          child: OutlinedButton(
            onPressed: _isLoading ? null : _handleGoogleSignIn,
            style: OutlinedButton.styleFrom(
              backgroundColor: Colors.white.withValues(alpha: 0.08),
              foregroundColor: Colors.white,
              side: BorderSide(
                color: Colors.white.withValues(alpha: 0.25),
                width: 1,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadii.lg),
              ),
            ),
            child: _isLoading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const FaIcon(
                        FontAwesomeIcons.google,
                        size: 18,
                        color: Colors.white,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Text(
                        'Google로 계속하기',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildKakaoButton(ThemeData theme) {
    return SizedBox(
      width: double.infinity,
      height: 58,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _handleKakaoSignIn,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFFEE500),
          foregroundColor: const Color(0xFF3C1E1E),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.lg),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            FaIcon(FontAwesomeIcons.comment, size: 18, color: Color(0xFF3C1E1E)),
            SizedBox(width: AppSpacing.md),
            Text(
              '카카오로 계속하기',
              style: TextStyle(
                color: Color(0xFF3C1E1E),
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorBanner(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.expense.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: AppColors.expense.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.expense, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              _errorMessage!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.expense,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Moving blob — gradient that drifts between two aligns, repeating.
// ────────────────────────────────────────────────────────────
class _MovingBlob extends StatefulWidget {
  final RadialGradient gradient;
  final double size;
  final Alignment startAlign;
  final Alignment endAlign;
  final Duration duration;

  const _MovingBlob({
    required this.gradient,
    required this.size,
    required this.startAlign,
    required this.endAlign,
    required this.duration,
  });

  @override
  State<_MovingBlob> createState() => _MovingBlobState();
}

class _MovingBlobState extends State<_MovingBlob>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<Alignment> _align;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration)
      ..repeat(reverse: true);
    _align = AlignmentTween(begin: widget.startAlign, end: widget.endAlign)
        .animate(CurvedAnimation(parent: _c, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => Align(
        alignment: _align.value,
        child: IgnorePointer(
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: widget.gradient,
            ),
          ),
        ),
      ),
    );
  }
}
