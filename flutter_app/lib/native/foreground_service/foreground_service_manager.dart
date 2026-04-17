import 'package:flutter/services.dart';

// ============================================================
// [포그라운드 서비스] foreground_service_manager.dart
// Android 상단 알림바에 상주하는 서비스를 관리합니다.
//
// MethodChannel('com.fastsaas02.app/foreground_service')을 통해
// Dart → Kotlin 네이티브 코드와 통신합니다.
//
// 주요 메서드:
//   startForegroundService()  — 알림 표시 + 서비스 시작
//   stopForegroundService()   — 서비스 중지
//   updateNotification()      — 알림 내용 업데이트
//   isForegroundServiceRunning() — 실행 상태 확인
//   hasNotificationPermission()  — 알림 권한 확인 (Android 13+)
//   requestNotificationPermission() — 알림 권한 요청
// ============================================================
class ForegroundServiceManager {
  static const platform =
      MethodChannel('com.fastsaas02.app/foreground_service');

  /// Start the foreground service
  static Future<void> startForegroundService({
    required String title,
    required String body,
    int notificationId = 1,
  }) async {
    try {
      await platform.invokeMethod<void>(
        'startForegroundService',
        {
          'title': title,
          'body': body,
          'notificationId': notificationId,
        },
      );
    } on PlatformException catch (e) {
      throw ForegroundServiceException(
        'Failed to start foreground service: ${e.message}',
      );
    }
  }

  /// Stop the foreground service
  static Future<void> stopForegroundService() async {
    try {
      await platform.invokeMethod<void>('stopForegroundService');
    } on PlatformException catch (e) {
      throw ForegroundServiceException(
        'Failed to stop foreground service: ${e.message}',
      );
    }
  }

  /// Update the foreground service notification
  static Future<void> updateNotification({
    required String title,
    required String body,
    int notificationId = 1,
  }) async {
    try {
      await platform.invokeMethod<void>(
        'updateNotification',
        {
          'title': title,
          'body': body,
          'notificationId': notificationId,
        },
      );
    } on PlatformException catch (e) {
      throw ForegroundServiceException(
        'Failed to update notification: ${e.message}',
      );
    }
  }

  /// Check if foreground service is running
  static Future<bool> isForegroundServiceRunning() async {
    try {
      final result = await platform.invokeMethod<bool>(
        'isForegroundServiceRunning',
      );
      return result ?? false;
    } on PlatformException catch (e) {
      throw ForegroundServiceException(
        'Failed to check foreground service status: ${e.message}',
      );
    }
  }

  /// Check if notification permission is granted
  static Future<bool> hasNotificationPermission() async {
    try {
      final result = await platform.invokeMethod<bool>(
        'hasNotificationPermission',
      );
      return result ?? false;
    } on PlatformException catch (e) {
      throw ForegroundServiceException(
        'Failed to check notification permission: ${e.message}',
      );
    }
  }

  /// Request notification permission (Android 13+)
  static Future<void> requestNotificationPermission() async {
    try {
      await platform.invokeMethod<void>('requestNotificationPermission');
    } on PlatformException catch (e) {
      throw ForegroundServiceException(
        'Failed to request notification permission: ${e.message}',
      );
    }
  }
}

/// Exception for foreground service errors
class ForegroundServiceException implements Exception {
  final String message;

  ForegroundServiceException(this.message);

  @override
  String toString() => 'ForegroundServiceException: $message';
}
