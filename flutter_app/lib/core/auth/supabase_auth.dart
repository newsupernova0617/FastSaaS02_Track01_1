import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_app/core/constants/app_constants.dart';
import 'package:flutter_app/core/storage/native_shared_prefs.dart';

// ============================================================
// [인증 서비스] supabase_auth.dart
// Supabase를 통한 사용자 인증(로그인/회원가입/로그아웃)을 담당합니다.
//
// 싱글톤 패턴: 앱 전체에서 하나의 인스턴스만 존재
// 주요 기능:
//   - initialize()       : 앱 시작 시 Supabase SDK 초기화
//   - signInWithPassword(): 이메일+비밀번호 로그인
//   - signUp()           : 회원가입
//   - signOut()          : 로그아웃
//   - refreshSession()   : 만료된 JWT 토큰 갱신
//   - _syncToNativePrefs(): 인증 정보를 SharedPreferences에 저장
//     → Android 네이티브 코드(빠른입력)가 JWT를 읽을 수 있도록
// ============================================================
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
      await NativeSharedPrefs.setApiBaseUrl(AppConstants.apiBaseUrl);
      _instance._syncToNativePrefs(_instance.currentSession);
      _instance.client.auth.onAuthStateChange.listen((data) {
        _instance._syncToNativePrefs(data.session);
      });
    } catch (e) {
      print('Error initializing Supabase: $e');
      rethrow;
    }
  }

  /// Mirror auth state to SharedPreferences so native Android code
  /// (QuickEntryReceiver / headless FlutterEngine) can read JWT and user id
  /// when the main app process is not alive.
  void _syncToNativePrefs(Session? session) {
    if (session == null) {
      NativeSharedPrefs.clearAuth();
    } else {
      NativeSharedPrefs.setJwt(session.accessToken);
      NativeSharedPrefs.setUserId(session.user.id);
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
