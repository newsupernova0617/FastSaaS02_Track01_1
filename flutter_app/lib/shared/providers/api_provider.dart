import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/api/api_client.dart';
import 'package:flutter_app/core/api/api_interceptor.dart';
import 'package:flutter_app/core/constants/app_constants.dart';
import 'auth_provider.dart';

/// Provider for Dio instance with authentication
/// Creates a Dio client that automatically injects JWT tokens from the auth provider
/// and handles token refresh on 401 errors
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
