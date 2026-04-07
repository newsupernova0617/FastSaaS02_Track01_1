import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_app/app.dart';
import 'package:flutter_app/core/auth/supabase_auth.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables from .env file
  await dotenv.load(fileName: '.env');

  // Initialize Supabase before running the app
  try {
    await SupabaseAuthService.initialize();
  } catch (e) {
    print('Failed to initialize Supabase: $e');
  }

  runApp(const App());
}
