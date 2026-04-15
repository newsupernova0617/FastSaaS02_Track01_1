import 'package:shared_preferences/shared_preferences.dart';

/// Keys mirrored into SharedPreferences so Android native code (Kotlin) can
/// read them from a BroadcastReceiver / headless FlutterEngine context.
///
/// IMPORTANT: Flutter's shared_preferences plugin stores values in the file
/// `FlutterSharedPreferences.xml` and automatically prefixes every key with
/// `flutter.`. From Kotlin:
///
///   val prefs = context.getSharedPreferences("FlutterSharedPreferences", MODE_PRIVATE)
///   val jwt = prefs.getString("flutter.fastsaas.jwt", null)
///   val sessionId = prefs.getLong("flutter.fastsaas.session_id", -1L)
///
/// Do not change these key names without also updating the Kotlin side.
class NativeSharedPrefs {
  static const String kJwt = 'fastsaas.jwt';
  static const String kUserId = 'fastsaas.user_id';
  static const String kSessionId = 'fastsaas.session_id';
  static const String kApiBaseUrl = 'fastsaas.api_base_url';

  static Future<void> setJwt(String? token) async {
    final prefs = await SharedPreferences.getInstance();
    if (token == null || token.isEmpty) {
      await prefs.remove(kJwt);
    } else {
      await prefs.setString(kJwt, token);
    }
  }

  static Future<void> setUserId(String? userId) async {
    final prefs = await SharedPreferences.getInstance();
    if (userId == null || userId.isEmpty) {
      await prefs.remove(kUserId);
    } else {
      await prefs.setString(kUserId, userId);
    }
  }

  static Future<void> setSessionId(int? sessionId) async {
    final prefs = await SharedPreferences.getInstance();
    if (sessionId == null) {
      await prefs.remove(kSessionId);
    } else {
      await prefs.setInt(kSessionId, sessionId);
    }
  }

  static Future<void> setApiBaseUrl(String baseUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kApiBaseUrl, baseUrl);
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(kJwt);
    await prefs.remove(kUserId);
    await prefs.remove(kSessionId);
  }
}
