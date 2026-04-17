import 'package:flutter/services.dart';

// ============================================================
// [오버레이 서비스] overlay_service.dart
// Android에서 다른 앱 위에 떠다니는 플로팅 창을 관리합니다.
// MethodChannel('com.fastsaas02.app/overlay')로 Kotlin과 통신합니다.
//
// 주요 메서드:
//   startOverlay()  — 플로팅 창 표시
//   stopOverlay()   — 플로팅 창 닫기
//   sendMessage()   — 플로팅 창에 메시지 전송
//   isOverlayRunning() — 실행 상태 확인
//   hasOverlayPermission()    — 오버레이 권한 확인
//   requestOverlayPermission() — 오버레이 권한 요청 (Android 6.0+)
// ============================================================
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
