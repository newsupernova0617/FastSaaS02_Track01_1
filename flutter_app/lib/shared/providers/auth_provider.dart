import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_app/core/logger/logger.dart';
import 'package:flutter_app/core/auth/supabase_auth.dart';

// ============================================================
// [인증 Provider] auth_provider.dart
// Supabase 인증 관련 상태를 Riverpod provider로 제공합니다.
// 다른 파일에서 ref.watch(xxxProvider)로 인증 상태를 구독할 수 있습니다.
//
// 제공하는 provider들:
//   supabaseAuthProvider  — SupabaseAuthService 싱글톤 인스턴스
//   authStateProvider     — 로그인/로그아웃 이벤트 스트림 (StreamProvider)
//   currentUserProvider   — 현재 로그인된 사용자 정보 (User?)
//   currentSessionProvider— 현재 인증 세션 (Session?)
//   accessTokenProvider   — JWT 토큰 문자열 (String?)
//   isAuthenticatedProvider— 로그인 여부 (bool)
//   signInProvider        — 이메일+비밀번호 로그인 실행
//   signUpProvider        — 회원가입 실행
//   signOutProvider       — 로그아웃 실행
// ============================================================

// Supabase 인증 서비스 싱글톤을 provider로 제공
final supabaseAuthProvider = Provider<SupabaseAuthService>((ref) {
  return SupabaseAuthService();
});

/// Stream provider for auth state changes
/// Reactively watches for authentication state changes from Supabase
final authStateProvider = StreamProvider<AuthState>((ref) {
  final authService = ref.watch(supabaseAuthProvider);
  return authService.client.auth.onAuthStateChange;
});

/// Provider for the current user
/// Returns the currently authenticated user or null if not signed in
final currentUserProvider = Provider<User?>((ref) {
  final authService = ref.watch(supabaseAuthProvider);
  return authService.currentUser;
});

/// Provider for the current session
/// Returns the current authentication session or null if not authenticated
final currentSessionProvider = Provider<Session?>((ref) {
  final authService = ref.watch(supabaseAuthProvider);
  return authService.currentSession;
});

/// Provider for the current user's access token
/// Returns the JWT token string or null if not authenticated
final accessTokenProvider = Provider<String?>((ref) {
  final authService = ref.watch(supabaseAuthProvider);
  return authService.accessToken;
});

/// Provider to check authentication status
/// Returns true if user is authenticated, false otherwise
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authService = ref.watch(supabaseAuthProvider);
  return authService.isAuthenticated;
});

/// Family provider for signing in with email and password
/// Usage: ref.read(signInProvider(email, password).future)
final signInProvider = FutureProvider.family<User?, (String, String)>((ref, credentials) async {
  final authService = ref.watch(supabaseAuthProvider);
  try {
    final response = await authService.signInWithPassword(
      email: credentials.$1,
      password: credentials.$2,
    );
    return response.user;
  } catch (e) {
    Logger().error('Sign in failed: $e', error: e);
    rethrow;
  }
});

/// Family provider for signing up with email and password
/// Usage: ref.read(signUpProvider(email, password).future)
final signUpProvider = FutureProvider.family<User?, (String, String)>((ref, credentials) async {
  final authService = ref.watch(supabaseAuthProvider);
  try {
    final response = await authService.signUp(
      email: credentials.$1,
      password: credentials.$2,
    );
    return response.user;
  } catch (e) {
    Logger().error('Sign up failed: $e', error: e);
    rethrow;
  }
});

/// Provider for signing out the current user
/// Usage: ref.read(signOutProvider.future)
final signOutProvider = FutureProvider<void>((ref) async {
  final authService = ref.watch(supabaseAuthProvider);
  try {
    await authService.signOut();
  } catch (e) {
    Logger().error('Sign out failed: $e', error: e);
    rethrow;
  }
});

/// Provider for refreshing the current session
/// Usage: ref.read(refreshSessionProvider.future)
final refreshSessionProvider = FutureProvider<Session?>((ref) async {
  final authService = ref.watch(supabaseAuthProvider);
  try {
    final response = await authService.refreshSession();
    return response.session;
  } catch (e) {
    Logger().error('Refresh session failed: $e', error: e);
    rethrow;
  }
});

/// Family provider for resetting password with email
/// Usage: ref.read(resetPasswordProvider(email).future)
final resetPasswordProvider = FutureProvider.family<void, String>((ref, email) async {
  final authService = ref.watch(supabaseAuthProvider);
  try {
    await authService.resetPasswordForEmail(email);
  } catch (e) {
    Logger().error('Reset password failed: $e', error: e);
    rethrow;
  }
});

/// Provider for updating the user password
/// Usage: ref.read(updatePasswordProvider(newPassword).future)
final updatePasswordProvider = FutureProvider.family<void, String>((ref, newPassword) async {
  final authService = ref.watch(supabaseAuthProvider);
  try {
    await authService.updatePassword(newPassword);
  } catch (e) {
    Logger().error('Update password failed: $e', error: e);
    rethrow;
  }
});
