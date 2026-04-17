// ============================================================
// [로거] logger.dart
// 앱 전체에서 사용하는 로깅 유틸리티입니다. 싱글톤 패턴.
//
// 로그 레벨: debug < info < warn < error
//   → minLogLevel 이상만 출력 (기본: debug = 전부 출력)
//
// 민감정보 마스킹: password, token, authorization 등
//   포함된 키의 값을 '***MASKED***'로 대체하여 로그 유출 방지
//
// 사용법: Logger().info('메시지'), Logger().error('에러', error: e)
// ============================================================

enum LogLevel {
  debug(0),
  info(1),
  warn(2),
  error(3);

  final int priority;
  const LogLevel(this.priority);

  String get label => name.toUpperCase();
}

class Logger {
  static final Logger _instance = Logger._internal();
  late LogLevel _minLogLevel;
  late bool _maskSensitiveData;

  Logger._internal() {
    _minLogLevel = LogLevel.debug;
    _maskSensitiveData = true;
  }

  factory Logger() {
    return _instance;
  }

  /// Initialize logger with configuration
  static void init({
    LogLevel minLogLevel = LogLevel.debug,
    bool maskSensitiveData = true,
  }) {
    _instance._minLogLevel = minLogLevel;
    _instance._maskSensitiveData = maskSensitiveData;
  }

  /// Log debug message (lowest priority)
  void debug(String message, {dynamic error, StackTrace? stackTrace}) {
    _log(LogLevel.debug, message, error, stackTrace);
  }

  /// Log info message
  void info(String message, {dynamic error, StackTrace? stackTrace}) {
    _log(LogLevel.info, message, error, stackTrace);
  }

  /// Log warning message
  void warn(String message, {dynamic error, StackTrace? stackTrace}) {
    _log(LogLevel.warn, message, error, stackTrace);
  }

  /// Log error message (highest priority)
  void error(String message, {dynamic error, StackTrace? stackTrace}) {
    _log(LogLevel.error, message, error, stackTrace);
  }

  void _log(
    LogLevel level,
    String message,
    dynamic error,
    StackTrace? stackTrace,
  ) {
    if (level.priority < _minLogLevel.priority) return;

    final timestamp = DateTime.now().toIso8601String();
    final logLine = '[$timestamp] [${level.label}] $message';

    print(logLine);

    if (error != null) {
      print('[ERROR] $error');
    }

    if (stackTrace != null) {
      print('[STACKTRACE]\n$stackTrace');
    }
  }

  /// Mask sensitive data in objects
  static Map<String, dynamic>? maskSensitiveData(dynamic data) {
    final logger = Logger();
    if (!logger._maskSensitiveData || data == null) return null;

    if (data is Map<String, dynamic>) {
      return _maskMap(data);
    }
    return null;
  }

  static const List<String> _sensitiveKeys = [
    'password',
    'token',
    'authorization',
    'secret',
    'apikey',
    'accesstoken',
    'refreshtoken',
  ];

  static Map<String, dynamic> _maskMap(Map<String, dynamic> map) {
    final result = <String, dynamic>{};
    for (final entry in map.entries) {
      if (_isSensitiveKey(entry.key)) {
        result[entry.key] = '***MASKED***';
      } else if (entry.value is Map<String, dynamic>) {
        result[entry.key] = _maskMap(entry.value as Map<String, dynamic>);
      } else if (entry.value is List) {
        result[entry.key] = (entry.value as List)
            .map((item) => item is Map<String, dynamic> ? _maskMap(item) : item)
            .toList();
      } else {
        result[entry.key] = entry.value;
      }
    }
    return result;
  }

  static bool _isSensitiveKey(String key) {
    final lowerKey = key.toLowerCase();
    return _sensitiveKeys.any((sensitive) => lowerKey.contains(sensitive));
  }
}
