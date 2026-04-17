// ============================================================
// [네트워크 로거] network_logger.dart
// HTTP 요청/응답을 구조화된 형식으로 로그에 기록합니다.
// LoggingInterceptor에서 호출되어 모든 API 통신을 추적합니다.
//
// 기록 내용:
//   요청: HTTP 메서드, URL, 헤더(마스킹), 요청 데이터(마스킹)
//   응답: 상태코드, 소요시간(ms), 응답크기, 응답 데이터(마스킹)
//   에러: 상태코드, 에러 유형, 에러 메시지
// ============================================================

import 'package:dio/dio.dart';
import 'logger.dart';

class NetworkLogger {
  static final NetworkLogger _instance = NetworkLogger._internal();

  NetworkLogger._internal();

  factory NetworkLogger() {
    return _instance;
  }

  /// Log outgoing request
  void logRequest(
    RequestOptions options, {
    required DateTime startTime,
  }) {
    final method = options.method;
    final path = options.path;
    final logger = Logger();

    final buffer = StringBuffer();
    buffer.writeln('[REQUEST] $method $path');
    buffer.writeln('  URL: ${options.baseUrl}$path');

    // Log headers (masked)
    if (options.headers.isNotEmpty) {
      final maskedHeaders = _maskHeaders(options.headers);
      buffer.writeln('  Headers: $maskedHeaders');
    }

    // Log request data (masked)
    if (options.data != null) {
      final maskedData = Logger.maskSensitiveData(options.data);
      buffer.writeln('  Data: ${maskedData ?? options.data}');
    }

    logger.info(buffer.toString());
  }

  /// Log received response
  void logResponse(
    Response response, {
    required DateTime startTime,
  }) {
    final method = response.requestOptions.method;
    final path = response.requestOptions.path;
    final statusCode = response.statusCode;
    final duration = DateTime.now().difference(startTime).inMilliseconds;
    final logger = Logger();

    final statusEmoji = _getStatusEmoji(statusCode);

    final buffer = StringBuffer();
    buffer.writeln('[RESPONSE] $statusEmoji $method $path');
    buffer.writeln('  Status: $statusCode');
    buffer.writeln('  Duration: ${duration}ms');
    buffer.writeln('  Size: ${_getResponseSize(response)} bytes');

    // Log response data (masked)
    if (response.data != null) {
      final maskedData = Logger.maskSensitiveData(response.data);
      final displayData = maskedData ?? response.data;
      buffer.writeln('  Data: $displayData');
    }

    logger.info(buffer.toString());
  }

  /// Log error response
  void logError(
    DioException error, {
    required DateTime startTime,
  }) {
    final method = error.requestOptions.method;
    final path = error.requestOptions.path;
    final statusCode = error.response?.statusCode;
    final duration = DateTime.now().difference(startTime).inMilliseconds;
    final logger = Logger();

    final buffer = StringBuffer();
    buffer.writeln('[ERROR] ❌ $method $path');
    if (statusCode != null) {
      buffer.writeln('  Status: $statusCode');
    }
    buffer.writeln('  Duration: ${duration}ms');
    buffer.writeln('  Type: ${error.type.name}');
    buffer.writeln('  Message: ${error.message ?? "Unknown error"}');

    // Log error response data if available (masked)
    if (error.response?.data != null) {
      final maskedData = Logger.maskSensitiveData(error.response!.data);
      buffer.writeln('  Response: ${maskedData ?? error.response!.data}');
    }

    logger.error(buffer.toString());
  }

  /// Get emoji based on HTTP status code
  String _getStatusEmoji(int? status) {
    if (status == null) return '❓';
    if (status >= 200 && status < 300) return '✓';
    if (status >= 300 && status < 400) return '↪️';
    if (status >= 400 && status < 500) return '⚠️';
    return '❌';
  }

  /// Calculate response size in bytes
  int _getResponseSize(Response response) {
    if (response.data == null) return 0;

    if (response.data is String) {
      return (response.data as String).length;
    }

    if (response.data is Map) {
      return response.data.toString().length;
    }

    if (response.data is List) {
      return response.data.toString().length;
    }

    return response.data.toString().length;
  }

  /// Mask sensitive headers
  Map<String, dynamic> _maskHeaders(Map<String, dynamic> headers) {
    const sensitiveHeaderKeys = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ];

    final result = <String, dynamic>{};
    for (final entry in headers.entries) {
      if (sensitiveHeaderKeys.contains(entry.key.toLowerCase())) {
        result[entry.key] = '***MASKED***';
      } else {
        result[entry.key] = entry.value;
      }
    }
    return result;
  }
}
