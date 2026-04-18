import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/providers/onboarding_provider.dart';
import 'package:flutter_app/shared/widgets/app_shell.dart';
import 'package:flutter_app/features/auth/login_page.dart';
import 'package:flutter_app/features/onboarding/onboarding_page.dart';
import 'package:flutter_app/features/home/home_page.dart';
import 'package:flutter_app/features/record/record_page.dart';
import 'package:flutter_app/features/calendar/calendar_page.dart';
import 'package:flutter_app/features/stats/stats_page.dart';
import 'package:flutter_app/features/reports/report_detail_page.dart';
import 'package:flutter_app/features/chat/screens/chat_screen.dart';
import 'package:flutter_app/features/settings/settings_page.dart';

// ============================================================
// [Phase 3] app_router.dart
// 5-slot shell: Home / Calendar / <AI FAB> / Stats / Settings.
// /record is pushed as a full-screen modal (from Home FAB), not a tab.
// /chat is pushed as a full-screen from the central AI FAB.
// Custom fade-scale page transition throughout.
// ============================================================

CustomTransitionPage<T> _fadeScale<T>({
  required LocalKey? key,
  required Widget child,
  Duration duration = AppMotion.medium,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    transitionDuration: duration,
    reverseTransitionDuration: duration,
    transitionsBuilder: (context, animation, secondary, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: AppMotion.emphasizedDecel,
      );
      return FadeTransition(
        opacity: curved,
        child: Transform.scale(
          scale: 0.98 + curved.value * 0.02,
          child: child,
        ),
      );
    },
  );
}

CustomTransitionPage<T> _modalSlide<T>({
  required LocalKey? key,
  required Widget child,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    opaque: false,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    transitionDuration: AppMotion.medium,
    reverseTransitionDuration: AppMotion.medium,
    transitionsBuilder: (context, animation, secondary, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: AppMotion.emphasizedDecel,
      );
      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 1),
          end: Offset.zero,
        ).animate(curved),
        child: child,
      );
    },
  );
}

// Root navigator — used to push /chat, /record, /report/:id, /onboarding,
// /login full-screen (above AppShell). Without this key, pushes from a
// ShellRoute child nest inside the shell's inner navigator and leave the
// GlowNavBar visible on top.
final _rootNavigatorKey = GlobalKey<NavigatorState>();

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  final onboardingState = ref.watch(onboardingCompletedProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      if (onboardingState.isLoading) return null;
      final onboardingDone = onboardingState.value ?? false;

      if (!onboardingDone) {
        return state.matchedLocation == '/onboarding' ? null : '/onboarding';
      }

      if (authState.isLoading) return null;
      final isAuthenticated =
          authState.whenData((s) => s.session != null).value ?? false;

      if (state.matchedLocation == '/onboarding') {
        return isAuthenticated ? '/home' : '/login';
      }

      if (!isAuthenticated && state.matchedLocation != '/login') {
        return '/login';
      }

      if (isAuthenticated && state.matchedLocation == '/login') {
        return '/home';
      }

      // Legacy redirects — old entry points now funnel to home.
      if (state.matchedLocation == '/') {
        return isAuthenticated ? '/home' : '/login';
      }

      return null;
    },
    routes: [
      // No-shell routes ──────────────────────────────────────
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        pageBuilder: (context, state) =>
            _fadeScale(key: state.pageKey, child: const OnboardingPage()),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        pageBuilder: (context, state) =>
            _fadeScale(key: state.pageKey, child: const LoginPage()),
      ),
      GoRoute(path: '/', redirect: (context, state) => '/home'),

      // Modal: record (slide-up, covers shell)
      GoRoute(
        path: '/record',
        name: 'record',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) =>
            _modalSlide(key: state.pageKey, child: const RecordPage()),
      ),

      // Full-screen chat — 반드시 root navigator로 push 되어야 nav bar가
      // 사라지고 ChatInput이 nav bar 그림자에 가리지 않는다.
      GoRoute(
        path: '/chat',
        name: 'chat',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) =>
            _fadeScale(key: state.pageKey, child: const ChatScreen()),
      ),

      // Report detail
      GoRoute(
        path: '/report/:id',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final id = int.parse(state.pathParameters['id'] ?? '0');
          final extras = state.extra as Map<String, dynamic>?;
          final isFromStats = extras?['isFromStats'] as bool? ?? false;
          return _fadeScale(
            key: state.pageKey,
            child: ReportDetailPage(reportId: id, isFromStats: isFromStats),
          );
        },
      ),

      // Shell routes ─────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            name: 'home',
            pageBuilder: (context, state) =>
                _fadeScale(key: state.pageKey, child: const HomePage()),
          ),
          GoRoute(
            path: '/calendar',
            name: 'calendar',
            pageBuilder: (context, state) =>
                _fadeScale(key: state.pageKey, child: const CalendarPage()),
          ),
          GoRoute(
            path: '/stats',
            name: 'stats',
            pageBuilder: (context, state) =>
                _fadeScale(key: state.pageKey, child: const StatsPage()),
          ),
          GoRoute(
            path: '/settings',
            name: 'settings',
            pageBuilder: (context, state) =>
                _fadeScale(key: state.pageKey, child: const SettingsPage()),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) {
      return Scaffold(
        appBar: AppBar(title: const Text('오류')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('페이지를 찾을 수 없습니다.'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/home'),
                child: const Text('홈으로 돌아가기'),
              ),
            ],
          ),
        ),
      );
    },
  );
});
