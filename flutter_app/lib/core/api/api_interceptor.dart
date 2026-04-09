import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/logger/network_logger.dart';
import 'package:flutter_app/core/logger/logger.dart';

/// Logging Interceptor for Dio
/// Logs request and response information with timing and masking
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
