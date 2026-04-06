import 'package:flutter/material.dart';
import 'package:flutter_app/app.dart';
import 'package:flutter_app/core/auth/supabase_auth.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase before running the app
  try {
    await SupabaseAuthService.initialize();
  } catch (e) {
    print('Failed to initialize Supabase: $e');
  }

  runApp(const App());
}
