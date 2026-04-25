import 'package:dio/dio.dart';
import 'logger.dart';

class NetworkLogger {
  static final NetworkLogger _instance = NetworkLogger._internal();

  NetworkLogger._internal();

  factory NetworkLogger() => _instance;

  void logRequest(
    RequestOptions options, {
    required DateTime startTime,
  }) {
    Logger().debug('[REQUEST] ${options.method} ${options.path}');
  }

  void logResponse(
    Response response, {
    required DateTime startTime,
  }) {
    final duration = DateTime.now().difference(startTime).inMilliseconds;
    Logger().debug(
      '[RESPONSE] ${response.statusCode ?? 0} ${response.requestOptions.method} '
      '${response.requestOptions.path} (${duration}ms)',
    );
  }

  void logError(
    DioException error, {
    required DateTime startTime,
  }) {
    final duration = DateTime.now().difference(startTime).inMilliseconds;
    final statusCode = error.response?.statusCode;
    final statusText = statusCode != null ? ' $statusCode' : '';
    Logger().error(
      '[ERROR] ${error.requestOptions.method} ${error.requestOptions.path}$statusText '
      '(${duration}ms): ${error.message ?? "Unknown error"}',
      error: error.error,
    );
  }
}
