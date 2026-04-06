class AppConstants {
  // API Configuration
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  // Supabase Configuration
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

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
