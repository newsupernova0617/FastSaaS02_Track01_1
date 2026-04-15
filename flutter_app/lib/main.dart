import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_app/app.dart';
import 'package:flutter_app/core/auth/supabase_auth.dart';
import 'package:flutter_app/core/logger/logger.dart';
import 'package:flutter_app/native/foreground_service/foreground_service_manager.dart';
import 'package:flutter_app/native/foreground_service/quick_entry_handler.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Logger
  Logger.init(
    minLogLevel: LogLevel.debug,
    maskSensitiveData: true,
  );

  // Load environment variables from .env file
  await dotenv.load(fileName: '.env');

  // Initialize Supabase before running the app
  try {
    await SupabaseAuthService.initialize();
  } catch (e) {
    Logger().error('Failed to initialize Supabase: $e', error: e);
  }

  // Install the quick-entry MethodChannel handler so the alive-app path
  // (QuickEntryReceiver -> cached FlutterEngine) can dispatch into Dart.
  installQuickEntryHandler();

  // Start the persistent quick-input notification on Android. The service
  // only makes sense on Android; other platforms ignore the call.
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    try {
      await ForegroundServiceManager.startForegroundService(
        title: 'FastSaaS 가계부',
        body: '알림을 눌러 거래를 바로 입력하세요\n예) 점심 8000원 / 교통비 1250원',
      );
    } catch (e) {
      Logger().error('Failed to start foreground service: $e', error: e);
    }
  }

  runApp(const App());
}
