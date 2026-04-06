import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide Provider;
import 'package:flutter_app/core/auth/supabase_auth.dart';

/// Provider for the Supabase auth service singleton
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
    print('Sign in error: $e');
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
    print('Sign up error: $e');
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
    print('Sign out error: $e');
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
    print('Refresh session error: $e');
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
    print('Reset password error: $e');
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
    print('Update password error: $e');
    rethrow;
  }
});
