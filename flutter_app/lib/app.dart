import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/shared/providers/billing_provider.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/routes/app_router.dart';
import 'package:flutter_app/shared/providers/theme_provider.dart';

// ============================================================
// [루트 위젯] app.dart
// 1) ProviderScope — Riverpod 루트
// 2) MaterialApp.router — GoRouter 라우팅 + 라이트/다크 테마
// ============================================================
class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: Consumer(
        builder: (context, ref, child) {
          ref.watch(billingPurchaseListenerProvider);
          final goRouter = ref.watch(goRouterProvider);
          final themeMode = ref.watch(themeModeProvider);
          final primaryPreset = ref.watch(primaryColorPresetProvider);

          return MaterialApp.router(
            title: '쉬운AI가계부',
            theme: AppTheme.lightThemeFor(primaryPreset.palette),
            darkTheme: AppTheme.darkThemeFor(primaryPreset.palette),
            themeMode: themeMode,
            routerConfig: goRouter,
            builder: (context, child) {
              if (kIsWeb) {
                return MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(viewInsets: MediaQuery.of(context).viewInsets),
                  child: child!,
                );
              }
              return child!;
            },
          );
        },
      ),
    );
  }
}
