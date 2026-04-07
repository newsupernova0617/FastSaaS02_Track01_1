import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Logging Interceptor for Dio
/// Logs request and response information for debugging
class LoggingInterceptor extends Interceptor {
  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final fullUrl = '${options.baseUrl}${options.path}';
    _log('REQUEST', options.method, options.path,
        headers: options.headers, data: options.data, fullUrl: fullUrl);
    handler.next(options);
  }

  @override
  Future<void> onResponse(Response response, ResponseInterceptorHandler handler) async {
    _log('RESPONSE', response.requestOptions.method, response.requestOptions.path,
        statusCode: response.statusCode, data: response.data);
    handler.next(response);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    _log('ERROR', err.requestOptions.method, err.requestOptions.path,
        statusCode: err.response?.statusCode, error: err.message);
    handler.next(err);
  }

  void _log(String type, String method, String path,
      {int? statusCode, Map<String, dynamic>? headers, dynamic data, String? error, String? fullUrl}) {
    final buffer = StringBuffer();
    buffer.writeln('[\t$type\t] $method $path');
    if (fullUrl != null) buffer.writeln('Full URL: $fullUrl');
    if (statusCode != null) buffer.writeln('Status Code: $statusCode');
    if (headers != null && headers.isNotEmpty) {
      buffer.writeln('Headers:');
      headers.forEach((key, value) {
        buffer.writeln('  $key: $value');
      });
    }
    if (data != null) {
      buffer.writeln('Data: $data');
    }
    if (error != null) {
      buffer.writeln('Error: $error');
    }
    print(buffer.toString());
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

    if (token != null && token.isNotEmpty) {
      // Attach Bearer token to Authorization header
      options.headers['Authorization'] = 'Bearer $token';
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
      print('[AUTH] Refreshing token...');
      await refreshToken();

      final newToken = await getToken();
      print('[AUTH] Token refreshed successfully');
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
      print('[AUTH] Token refresh failed: $e');
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
}

// Placeholder for dioProvider (will be injected from api_provider.dart)
// This is used for retrying requests after token refresh
final dioProvider = Provider<Dio>((ref) {
  throw UnimplementedError('dioProvider must be overridden in api_provider.dart');
});
