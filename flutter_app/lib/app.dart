import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_app/shared/providers/billing_provider.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/routes/app_router.dart';
import 'package:flutter_app/shared/providers/theme_provider.dart';
import 'package:flutter_app/native/foreground_service/foreground_service_manager.dart';

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
              return _QuickInputPromptGate(child: child!);
            },
          );
        },
      ),
    );
  }
}

class _QuickInputPromptGate extends StatefulWidget {
  final Widget child;

  const _QuickInputPromptGate({required this.child});

  @override
  State<_QuickInputPromptGate> createState() => _QuickInputPromptGateState();
}

class _QuickInputPromptGateState extends State<_QuickInputPromptGate> {
  static const _prefsKey = 'app.quick_input.prompted';
  bool _handled = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_handled) return;
    _handled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybePrompt());
  }

  Future<void> _maybePrompt() async {
    if (!mounted || kIsWeb) return;
    final prefs = await SharedPreferences.getInstance();
    final prompted = prefs.getBool(_prefsKey) ?? false;
    if (prompted) return;

    final accepted = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('빠른 입력 알림 설정'),
        content: const Text(
          '앱을 열지 않고도 알림에서 바로 거래를 입력할 수 있습니다. 지금 빠른 입력 알림을 켤까요?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('나중에'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('지금 켜기'),
          ),
        ],
      ),
    );

    await prefs.setBool(_prefsKey, true);

    if (accepted == true && mounted) {
      try {
        await ForegroundServiceManager.enableQuickInput(
          title: '쉬운AI가계부',
          body: '알림을 눌러 거래를 바로 입력하세요\n예) 점심 8000원 / 교통비 1250원',
        );
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('빠른 입력 알림을 시작하지 못했습니다.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
