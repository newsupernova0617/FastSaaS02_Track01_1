import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Logging Interceptor for Dio
/// Logs request and response information for debugging
class LoggingInterceptor extends Interceptor {
  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    _log('REQUEST', options.method, options.path,
        headers: options.headers, data: options.data);
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
      {int? statusCode, Map<String, dynamic>? headers, dynamic data, String? error}) {
    final buffer = StringBuffer();
    buffer.writeln('[\t$type\t] $method $path');
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
/// Handles 401 errors with token refresh
class AuthInterceptor extends Interceptor {
  final Ref ref;
  final Future<String?> Function() getToken;

  AuthInterceptor({
    required this.ref,
    required this.getToken,
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
    if (err.response?.statusCode == 401) {
      // Token might be expired, attempt refresh
      // For now, we'll just propagate the error
      // Token refresh logic can be implemented when integrating with Supabase auth provider
      print('Unauthorized: Token may have expired');
    }

    handler.next(err);
  }
}

/// Provider for Auth Interceptor
/// To be used when creating Dio instance with authentication
final authInterceptorProvider = Provider<AuthInterceptor?>((ref) {
  // Return null by default - will be set up when auth provider is available
  // This will be integrated with the Supabase auth provider from Task 5
  return null;
});
