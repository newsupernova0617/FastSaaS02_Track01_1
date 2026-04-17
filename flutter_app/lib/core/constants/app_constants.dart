import 'package:flutter_dotenv/flutter_dotenv.dart';

// ============================================================
// [앱 상수] app_constants.dart
// 앱 전체에서 사용하는 설정값을 한곳에 모아둔 파일입니다.
// .env 파일에 값이 있으면 그 값을 사용하고, 없으면 기본값(fallback)을 사용합니다.
// ============================================================
class AppConstants {
  // 백엔드 API 서버 주소 (Cloudflare Workers)
  static String get apiBaseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'https://backend.fastsaas2.workers.dev/api';

  // Supabase 프로젝트 URL (인증, DB 등을 제공하는 BaaS)
  static String get supabaseUrl =>
      dotenv.env['SUPABASE_URL'] ?? 'https://uqvnepemplsdkkawbmdc.supabase.co';

  // Supabase 익명 키 (공개 가능한 키, 서버에서 JWT 검증에 사용)
  static String get supabaseAnonKey =>
      dotenv.env['SUPABASE_ANON_KEY'] ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdm5lcGVtcGxzZGtrYXdibWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODE5MTQsImV4cCI6MjA5MDE1NzkxNH0.X_zFEwbdSwSWNkkhgGRGp_VnmiJvhXZG1D-h45FovTQ';

  // 앱 기본 정보
  static const String appName = 'Mingun';
  static const String appVersion = '1.0.0';

  // API 타임아웃 설정 (초 단위)
  static const int apiTimeoutSeconds = 30;    // 응답 대기 최대 시간
  static const int connectTimeoutSeconds = 10; // 연결 시도 최대 시간

  // API 엔드포인트 경로 (apiBaseUrl 뒤에 붙음)
  static const String authEndpoint = '/auth';
  static const String usersEndpoint = '/users';
  static const String transactionsEndpoint = '/transactions';
  static const String categoriesEndpoint = '/categories';
  static const String statsEndpoint = '/stats';
  static const String aiChatEndpoint = '/ai/chat';
}
