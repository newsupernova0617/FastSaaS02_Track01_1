import 'package:shared_preferences/shared_preferences.dart';

// ============================================================
// [네이티브 저장소] native_shared_prefs.dart
// Flutter ↔ Android 네이티브(Kotlin) 간 데이터를 공유하는 저장소입니다.
//
// 왜 필요한가:
//   Android 알림에서 "빠른 입력" 시 앱 프로세스가 죽어있을 수 있음
//   → 네이티브 코드(QuickEntryReceiver)가 SharedPreferences에서
//     JWT 토큰, 세션 ID, API URL을 읽어서 직접 서버에 요청
//
// 저장되는 값:
//   fastsaas.jwt          — Supabase JWT 토큰
//   fastsaas.user_id      — 사용자 ID
//   fastsaas.session_id   — 현재 활성 세션 ID
//   fastsaas.api_base_url — 백엔드 API 서버 주소
//
// 주의: Flutter shared_preferences는 키 앞에 자동으로 'flutter.' 접두사를 붙임
//       → Kotlin에서는 "flutter.fastsaas.jwt"로 읽어야 함
// ============================================================
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
