import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';

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
    final contentWidth = isMobile ? double.infinity : 420.0;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _LandingBackground(),
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
                      GlassCard(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            child: Column(
                              children: [
                                _buildGoogleButton(theme),
                                const SizedBox(height: AppSpacing.md),
                                _buildKakaoButton(theme),
                              ],
                            ),
                          )
                          .animate(delay: 160.ms)
                          .fadeIn(duration: 450.ms)
                          .slideY(begin: 0.08, end: 0),
                      const SizedBox(height: AppSpacing.lg),
                      if (_errorMessage != null)
                        _buildErrorBanner(
                          theme,
                        ).animate().fadeIn(duration: 300.ms),
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
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(AppRadii.xl),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.18),
                  width: 0.8,
                ),
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                size: 42,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              '말로 기록하는\n가장 쉬운 가계부',
              style: theme.textTheme.headlineLarge?.copyWith(
                fontSize: 36,
                fontWeight: FontWeight.w900,
                height: 1.12,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              '로그인하고 AI가 정리해주는 소비 기록을 시작하세요.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.62),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        )
        .animate()
        .fadeIn(duration: 550.ms)
        .slideY(begin: 0.08, end: 0, curve: AppMotion.emphasizedDecel);
  }

  Widget _buildGoogleButton(ThemeData theme) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _handleGoogleSignIn,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.pill),
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
                  const FaIcon(FontAwesomeIcons.google, size: 18),
                  const SizedBox(width: AppSpacing.md),
                  Text(
                    'Google로 계속하기',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildKakaoButton(ThemeData theme) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton(
        onPressed: _isLoading ? null : _handleKakaoSignIn,
        style: OutlinedButton.styleFrom(
          backgroundColor: const Color(0xFFFFF6BF),
          foregroundColor: const Color(0xFF3C1E1E),
          side: BorderSide(
            color: const Color(0xFF3C1E1E).withValues(alpha: 0.08),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.pill),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            FaIcon(
              FontAwesomeIcons.comment,
              size: 18,
              color: Color(0xFF3C1E1E),
            ),
            SizedBox(width: AppSpacing.md),
            Text(
              '카카오로 계속하기',
              style: TextStyle(
                color: Color(0xFF3C1E1E),
                fontSize: 16,
                fontWeight: FontWeight.w800,
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
        color: AppColors.expense.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: AppColors.expense.withValues(alpha: 0.22)),
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
                height: 1.4,
              ),
            ),
          ),
        ],
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
          top: -80,
          left: -120,
          child: _BlurCircle(
            size: 280,
            color: AppColors.primary.withValues(alpha: 0.10),
          ),
        ),
        Positioned(
          top: 120,
          right: -100,
          child: _BlurCircle(
            size: 240,
            color: AppColors.primarySoft.withValues(alpha: 0.08),
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
