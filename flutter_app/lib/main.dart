import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter_app/app.dart';
import 'package:flutter_app/core/auth/supabase_auth.dart';
import 'package:flutter_app/core/ads/ad_service.dart';
import 'package:flutter_app/shared/widgets/ad_interstitial_trigger.dart';
import 'package:flutter_app/core/logger/logger.dart';
import 'package:flutter_app/native/foreground_service/foreground_service_manager.dart';
import 'package:flutter_app/native/foreground_service/quick_entry_handler.dart';

// ============================================================
// [앱 시작점] main.dart
// 앱이 실행되면 가장 먼저 이 함수가 호출됩니다.
// 순서: 로거 초기화 → .env 로드 → Supabase 인증 초기화
//       → 빠른입력 핸들러 설치 → (Android) 포그라운드 서비스 시작
//       → App 위젯 실행
// ============================================================
void main() async {
  // Flutter 엔진 초기화 (비동기 작업 전에 반드시 호출해야 함)
  WidgetsFlutterBinding.ensureInitialized();

  // 로거 초기화 — debug 이상 레벨 로그 출력, 민감정보(토큰 등) 마스킹
  Logger.init(
    minLogLevel: LogLevel.debug,
    maskSensitiveData: true,
  );

  // .env 파일에서 API URL, Supabase 키 등 환경변수 로드
  await dotenv.load(fileName: '.env');

  // 한국어 로케일 데이터 초기화 — DateFormat에 'ko' 로케일을 쓰려면 필요
  // (요일 'E'를 '금', 'EEEE'를 '금요일', 'a'를 '오전/오후'로 렌더)
  await initializeDateFormatting('ko', null);

  // Initialize AdMob SDK. Failure is logged and swallowed — app continues.
  await AdService.initialize();

  // Preload the first interstitial so it's ready by the time the user
  // generates their first report. Failure is silently swallowed.
  AdInterstitialTrigger.preload();

  // Supabase 인증 서비스 초기화 (로그인/회원가입 기능에 필요)
  try {
    await SupabaseAuthService.initialize();
  } catch (e) {
    Logger().error('Failed to initialize Supabase: $e', error: e);
  }

  // 빠른 입력 핸들러 설치
  // → Android 알림에서 텍스트를 입력하면 이 핸들러가 받아서 서버로 전송
  installQuickEntryHandler();

  // Android 전용: 알림 권한 확인 후 포그라운드 서비스 시작
  // → 이 알림을 통해 앱을 열지 않고도 거래를 빠르게 입력할 수 있음
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    try {
      final hasPermission =
          await ForegroundServiceManager.hasNotificationPermission();
      if (!hasPermission) {
        await ForegroundServiceManager.requestNotificationPermission();
      }
      // 권한이 허용된 경우에만 서비스 시작
      final granted =
          await ForegroundServiceManager.hasNotificationPermission();
      if (granted) {
        await ForegroundServiceManager.startForegroundService(
          title: 'FastSaaS 가계부',
          body: '알림을 눌러 거래를 바로 입력하세요\n예) 점심 8000원 / 교통비 1250원',
        );
      } else {
        Logger().warn('알림 권한이 거부되어 포그라운드 서비스를 시작하지 않음');
      }
    } catch (e) {
      Logger().error('Failed to start foreground service: $e', error: e);
    }
  }

  // 모든 초기화 완료 후 App 위젯을 화면에 띄움
  runApp(const App());
}
