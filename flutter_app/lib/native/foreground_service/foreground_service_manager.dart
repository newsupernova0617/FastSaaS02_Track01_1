import 'package:flutter/services.dart';

/// Manager for foreground service lifecycle on Android
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
