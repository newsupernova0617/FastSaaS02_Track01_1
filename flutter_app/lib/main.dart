import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_app/app.dart';
import 'package:flutter_app/core/auth/supabase_auth.dart';
import 'package:flutter_app/core/logger/logger.dart';

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

  runApp(const App());
}
