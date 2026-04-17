import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/logger/network_logger.dart';
import 'package:flutter_app/core/logger/logger.dart';

// ============================================================
// [HTTP 인터셉터] api_interceptor.dart
// Dio HTTP 클라이언트에 붙는 인터셉터(미들웨어)들입니다.
//
// 1) LoggingInterceptor — 모든 요청/응답을 로그로 기록
// 2) AuthInterceptor — 핵심! 두 가지 역할:
//    a) 모든 요청에 JWT 토큰을 Authorization 헤더에 자동 첨부
//    b) 401(인증만료) 에러 시 토큰을 자동 갱신하고 원래 요청을 재시도
//       → 여러 요청이 동시에 401을 받아도 토큰 갱신은 1번만 수행 (Completer 사용)
//       → 갱신 실패 시 자동 로그아웃
// ============================================================

// 요청/응답을 콘솔에 기록하는 인터셉터
class LoggingInterceptor extends Interceptor {
  final NetworkLogger _networkLogger = NetworkLogger();

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final startTime = DateTime.now();
    _networkLogger.logRequest(options, startTime: startTime);
    handler.next(options);
  }

  @override
  Future<void> onResponse(Response response, ResponseInterceptorHandler handler) async {
    final startTime = DateTime.now();
    _networkLogger.logResponse(response, startTime: startTime);
    handler.next(response);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final startTime = DateTime.now();
    _networkLogger.logError(err, startTime: startTime);
    handler.next(err);
  }
}

/// Auth Interceptor for Dio
/// Attaches JWT token from Supabase session to all requests
/// Handles 401 errors with automatic token refresh and request retry
class AuthInterceptor extends Interceptor {
  final Ref ref;
  final Future<String?> Function() getToken;
  final Future<void> Function() refreshToken;
  final Future<void> Function()? onRefreshFailed;

  // Completer to prevent race conditions when multiple requests fail with 401 simultaneously
  Completer<String?>? _refreshCompleter;

  AuthInterceptor({
    required this.ref,
    required this.getToken,
    required this.refreshToken,
    this.onRefreshFailed,
  });

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Get the JWT token from Supabase session
    final token = await getToken();

    print('[AuthInterceptor] onRequest called');
    print('[AuthInterceptor] Token: ${token != null ? 'EXISTS (${token.length} chars)' : 'NULL'}');
    print('[AuthInterceptor] URL: ${options.path}');

    if (token != null && token.isNotEmpty) {
      // Attach Bearer token to Authorization header
      options.headers['Authorization'] = 'Bearer $token';
      print('[AuthInterceptor] Authorization header added');
    } else {
      print('[AuthInterceptor] No token, skipping Authorization header');
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Handle 401 Unauthorized errors
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }

    // If already refreshing, wait for the result
    if (_refreshCompleter != null) {
      try {
        final newToken = await _refreshCompleter!.future;
        if (newToken != null) {
          // Retry the original request with the new token
          final opts = err.requestOptions;
          opts.headers['Authorization'] = 'Bearer $newToken';
          try {
            final response = await ref.read(dioProvider).fetch(opts);
            handler.resolve(response);
            return;
          } catch (e) {
            handler.next(DioException(
              requestOptions: opts,
              error: e,
            ));
            return;
          }
        }
      } catch (_) {
        handler.next(err);
        return;
      }
    }

    // First 401 request: attempt token refresh
    _refreshCompleter = Completer<String?>();
    try {
      final logger = _getLogger();
      logger.info('[AUTH] Refreshing token...');
      await refreshToken();

      final newToken = await getToken();
      logger.info('[AUTH] Token refreshed successfully');
      _refreshCompleter!.complete(newToken);

      if (newToken != null) {
        // Retry the original request with the new token
        final opts = err.requestOptions;
        opts.headers['Authorization'] = 'Bearer $newToken';
        try {
          final response = await ref.read(dioProvider).fetch(opts);
          handler.resolve(response);
          return;
        } catch (e) {
          handler.next(DioException(
            requestOptions: opts,
            error: e,
          ));
          return;
        }
      }
    } catch (e) {
      final logger = _getLogger();
      logger.error('[AUTH] Token refresh failed: $e', error: e);
      _refreshCompleter!.completeError(e);

      // Refresh failed, attempt logout
      try {
        await onRefreshFailed?.call();
      } catch (_) {}

      handler.next(err);
      return;
    } finally {
      _refreshCompleter = null;
    }
  }

  Logger _getLogger() => Logger();
}

// Placeholder for dioProvider (will be injected from api_provider.dart)
// This is used for retrying requests after token refresh
final dioProvider = Provider<Dio>((ref) {
  throw UnimplementedError('dioProvider must be overridden in api_provider.dart');
});
