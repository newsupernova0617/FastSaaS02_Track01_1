import 'package:flutter/services.dart';

/// Service for managing floating overlay on Android
class OverlayService {
  static const platform = MethodChannel('com.fastsaas02.app/overlay');

  /// Start the floating overlay window
  static Future<void> startOverlay({
    required String title,
    required String initialMessage,
  }) async {
    try {
      await platform.invokeMethod<void>(
        'startOverlay',
        {
          'title': title,
          'message': initialMessage,
        },
      );
    } on PlatformException catch (e) {
      throw OverlayException('Failed to start overlay: ${e.message}');
    }
  }

  /// Stop the floating overlay window
  static Future<void> stopOverlay() async {
    try {
      await platform.invokeMethod<void>('stopOverlay');
    } on PlatformException catch (e) {
      throw OverlayException('Failed to stop overlay: ${e.message}');
    }
  }

  /// Send a message to the overlay
  static Future<void> sendMessage(String message) async {
    try {
      await platform.invokeMethod<void>(
        'sendMessage',
        {'message': message},
      );
    } on PlatformException catch (e) {
      throw OverlayException('Failed to send message: ${e.message}');
    }
  }

  /// Check if overlay is currently running
  static Future<bool> isOverlayRunning() async {
    try {
      final result = await platform.invokeMethod<bool>('isOverlayRunning');
      return result ?? false;
    } on PlatformException catch (e) {
      throw OverlayException('Failed to check overlay status: ${e.message}');
    }
  }

  /// Get overlay permission status
  static Future<bool> hasOverlayPermission() async {
    try {
      final result =
          await platform.invokeMethod<bool>('hasOverlayPermission');
      return result ?? false;
    } on PlatformException catch (e) {
      throw OverlayException('Failed to check overlay permission: ${e.message}');
    }
  }

  /// Request overlay permission (Android 6.0+)
  static Future<void> requestOverlayPermission() async {
    try {
      await platform.invokeMethod<void>('requestOverlayPermission');
    } on PlatformException catch (e) {
      throw OverlayException('Failed to request overlay permission: ${e.message}');
    }
  }
}

/// Exception for overlay service errors
class OverlayException implements Exception {
  final String message;

  OverlayException(this.message);

  @override
  String toString() => 'OverlayException: $message';
}
