import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_app/core/constants/app_constants.dart';

/// Supabase authentication service
/// Initializes Supabase and provides methods for auth operations
class SupabaseAuthService {
  static final SupabaseAuthService _instance = SupabaseAuthService._internal();

  factory SupabaseAuthService() {
    return _instance;
  }

  SupabaseAuthService._internal();

  /// Get the Supabase client instance
  SupabaseClient get client => Supabase.instance.client;

  /// Get the current auth session
  Session? get currentSession => client.auth.currentSession;

  /// Get the current user
  User? get currentUser => client.auth.currentUser;

  /// Get the current user's access token
  String? get accessToken => currentSession?.accessToken;

  /// Check if user is authenticated
  bool get isAuthenticated => currentUser != null;

  /// Initialize Supabase
  /// Should be called at app startup before runApp()
  static Future<void> initialize() async {
    try {
      await Supabase.initialize(
        url: AppConstants.supabaseUrl,
        anonKey: AppConstants.supabaseAnonKey,
      );
    } catch (e) {
      print('Error initializing Supabase: $e');
      rethrow;
    }
  }

  /// Sign in with email and password
  Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) async {
    try {
      final response = await client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return response;
    } catch (e) {
      print('Error signing in: $e');
      rethrow;
    }
  }

  /// Sign up with email and password
  Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) async {
    try {
      final response = await client.auth.signUp(
        email: email,
        password: password,
      );
      return response;
    } catch (e) {
      print('Error signing up: $e');
      rethrow;
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    try {
      await client.auth.signOut();
    } catch (e) {
      print('Error signing out: $e');
      rethrow;
    }
  }

  /// Refresh the current session
  Future<AuthResponse> refreshSession() async {
    try {
      final response = await client.auth.refreshSession();
      return response;
    } catch (e) {
      print('Error refreshing session: $e');
      rethrow;
    }
  }

  /// Reset password with email
  Future<void> resetPasswordForEmail(String email) async {
    try {
      await client.auth.resetPasswordForEmail(
        email,
        redirectTo: 'com.fastsaas02.app://auth/callback',
      );
    } catch (e) {
      print('Error resetting password: $e');
      rethrow;
    }
  }

  /// Update user password
  Future<void> updatePassword(String newPassword) async {
    try {
      await client.auth.updateUser(
        UserAttributes(password: newPassword),
      );
    } catch (e) {
      print('Error updating password: $e');
      rethrow;
    }
  }
}
