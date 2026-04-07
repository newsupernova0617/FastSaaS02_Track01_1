import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConstants {
  // API Configuration
  static String get apiBaseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'https://backend.fastsaas2.workers.dev/api';

  // Supabase Configuration
  static String get supabaseUrl =>
      dotenv.env['SUPABASE_URL'] ?? 'https://uqvnepemplsdkkawbmdc.supabase.co';

  static String get supabaseAnonKey =>
      dotenv.env['SUPABASE_ANON_KEY'] ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdm5lcGVtcGxzZGtrYXdibWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODE5MTQsImV4cCI6MjA5MDE1NzkxNH0.X_zFEwbdSwSWNkkhgGRGp_VnmiJvhXZG1D-h45FovTQ';

  // App Configuration
  static const String appName = 'Mingun';
  static const String appVersion = '1.0.0';

  // Timeout values (in seconds)
  static const int apiTimeoutSeconds = 30;
  static const int connectTimeoutSeconds = 10;

  // API Endpoints
  static const String authEndpoint = '/auth';
  static const String usersEndpoint = '/users';
  static const String transactionsEndpoint = '/transactions';
  static const String categoriesEndpoint = '/categories';
  static const String statsEndpoint = '/stats';
  static const String aiChatEndpoint = '/ai/chat';
}
