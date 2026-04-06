import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/routes/app_router.dart';

/// Main application widget
/// Provides ProviderScope for Riverpod state management and MaterialApp with GoRouter
class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: Consumer(
        builder: (context, ref, child) {
          // Get the router from the provider
          final goRouter = ref.watch(goRouterProvider);

          return MaterialApp.router(
            title: 'Mingun',
            theme: AppTheme.lightTheme,
            routerConfig: goRouter,
          );
        },
      ),
    );
  }
}
