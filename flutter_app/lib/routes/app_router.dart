import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/widgets/bottom_nav_shell.dart';
import 'package:flutter_app/features/auth/login_page.dart';
import 'package:flutter_app/features/record/record_page.dart';
import 'package:flutter_app/features/calendar/calendar_page.dart';
import 'package:flutter_app/features/stats/stats_page.dart';
import 'package:flutter_app/features/ai_chat/ai_chat_page.dart';
import 'package:flutter_app/features/reports/report_detail_page.dart';
import 'package:flutter_app/features/chat/screens/chat_screen.dart';

// ============================================================
// [라우터 설정] app_router.dart
// 앱의 전체 화면 이동(네비게이션)을 관리합니다.
//
// 화면 구조:
//   /login   → 로그인 페이지 (비인증 상태)
//   /record  → 거래 기록 페이지 (하단 네비게이션 탭 1)
//   /calendar→ 달력 페이지 (탭 2)
//   /stats   → 통계 페이지 (탭 3)
//   /chat    → AI 채팅 페이지 (탭 4) — 세션 기반
//   /ai      → AI 채팅 (레거시, 세션 없는 버전)
//   /report/:id → 리포트 상세 페이지
//
// 핵심 동작:
//   - 로그인 안 됨 → 자동으로 /login 이동
//   - 로그인 됨 + /login에 있음 → 자동으로 /record 이동
//   - ShellRoute로 하단 네비게이션바를 공유
// ============================================================
final goRouterProvider = Provider<GoRouter>((ref) {
  // 인증 상태를 구독 → 로그인/로그아웃 시 자동으로 redirect 발동
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/login',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      // Check if the auth state is loading
      if (authState.isLoading) {
        return null;
      }

      // Check authentication state using the stream data
      final isAuthenticated = authState.whenData((authState) => authState.session != null).value ?? false;

      // If not authenticated and not already on login page, redirect to login
      if (!isAuthenticated && state.matchedLocation != '/login') {
        return '/login';
      }

      // If authenticated and on login page, redirect to record page
      if (isAuthenticated && state.matchedLocation == '/login') {
        return '/record';
      }

      return null;
    },
    routes: [
      // Login route (no shell)
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      // Placeholder root route
      GoRoute(
        path: '/',
        redirect: (context, state) => '/login',
      ),

      // Report detail route
      GoRoute(
        path: '/report/:id',
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id'] ?? '0');
          final extras = state.extra as Map<String, dynamic>?;
          final isFromStats = extras?['isFromStats'] as bool? ?? false;
          return ReportDetailPage(
            reportId: id,
            isFromStats: isFromStats,
          );
        },
      ),

      // Shell route for authenticated pages with bottom navigation
      ShellRoute(
        builder: (context, state, child) {
          return BottomNavShell(child: child);
        },
        routes: [
          // Record route
          GoRoute(
            path: '/record',
            name: 'record',
            builder: (context, state) => const RecordPage(),
          ),

          // Calendar route
          GoRoute(
            path: '/calendar',
            name: 'calendar',
            builder: (context, state) => const CalendarPage(),
          ),

          // Stats route
          GoRoute(
            path: '/stats',
            name: 'stats',
            builder: (context, state) => const StatsPage(),
          ),

          // AI Chat route (legacy)
          GoRoute(
            path: '/ai',
            name: 'ai',
            builder: (context, state) => const AIChatPage(),
          ),

          // Session-based Chat route
          GoRoute(
            path: '/chat',
            name: 'chat',
            builder: (context, state) => const ChatScreen(),
          ),
        ],
      ),
    ],
    // Error handling for unknown routes
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
                onPressed: () => context.go('/record'),
                child: const Text('홈으로 돌아가기'),
              ),
            ],
          ),
        ),
      );
    },
  );
});
