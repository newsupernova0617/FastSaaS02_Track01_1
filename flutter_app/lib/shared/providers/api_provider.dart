import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/api/api_client.dart';
import 'package:flutter_app/core/api/api_interceptor.dart';
import 'package:flutter_app/core/constants/app_constants.dart';
import 'auth_provider.dart';

// ============================================================
// [API Provider] api_provider.dart
// 인증이 포함된 Dio HTTP 클라이언트와 ApiClient를 제공합니다.
//
// 데이터 흐름:
//   authenticatedDioProvider (Dio + JWT 토큰 자동 첨부)
//     → apiClientProvider (ApiClient — 실제 API 호출 메서드들)
//     → 각 화면에서 apiClientProvider를 통해 서버와 통신
//
// 토큰 만료 시: AuthInterceptor가 자동으로 갱신 → 재시도
// 갱신 실패 시: 자동 로그아웃 → GoRouter가 /login으로 리다이렉트
// ============================================================

// 인증 토큰이 자동으로 붙는 Dio 인스턴스
final authenticatedDioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: Duration(seconds: AppConstants.connectTimeoutSeconds),
      receiveTimeout: Duration(seconds: AppConstants.apiTimeoutSeconds),
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
    ),
  );

  // Add logging interceptor
  dio.interceptors.add(LoggingInterceptor());

  // Add auth interceptor that injects JWT token and handles 401 refresh
  final authInterceptor = AuthInterceptor(
    ref: ref,
    getToken: () async {
      // Get the access token from the auth provider
      final token = ref.read(accessTokenProvider);
      print('[AUTH] Token from provider: ${token != null ? 'EXISTS (${token.length} chars)' : 'NULL'}');
      return token;
    },
    refreshToken: () async {
      // Refresh the session when access token expires
      final authService = ref.read(supabaseAuthProvider);
      await authService.refreshSession();
    },
    onRefreshFailed: () async {
      // If token refresh fails, sign out the user
      // This will trigger authStateProvider to update and GoRouter will redirect to /login
      final authService = ref.read(supabaseAuthProvider);
      await authService.signOut();
    },
  );
  dio.interceptors.add(authInterceptor);

  return dio;
});

/// Provider for the API Client
/// Lazy provider that creates the ApiClient with authenticated Dio instance
/// Depends on auth provider to ensure proper token injection
final apiClientProvider = Provider<ApiClient>((ref) {
  final dio = ref.watch(authenticatedDioProvider);
  return ApiClient(dio: dio);
});

/// Provider to check if API client is ready
/// Returns false if user is not authenticated, true otherwise
final isApiClientReadyProvider = Provider<bool>((ref) {
  final isAuthenticated = ref.watch(isAuthenticatedProvider);
  return isAuthenticated;
});

/// Override dioProvider from api_interceptor.dart to provide the authenticated Dio instance
/// This allows AuthInterceptor to use the same Dio instance for retry requests
final dioProvider = Provider<Dio>((ref) {
  return ref.watch(authenticatedDioProvider);
});
