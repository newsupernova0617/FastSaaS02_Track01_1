import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/routes/app_router.dart';

// ============================================================
// [루트 위젯] app.dart
// 앱의 최상위 위젯. 두 가지 핵심 역할:
// 1) ProviderScope — Riverpod 상태관리의 루트 (모든 provider가 여기서 시작)
// 2) MaterialApp.router — GoRouter를 사용한 라우팅 + 테마 적용
// ============================================================
class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    // ProviderScope: Riverpod의 모든 상태(provider)를 앱 전체에 제공
    return ProviderScope(
      // Consumer: provider 값의 변화를 감지하여 자동으로 UI를 다시 그림
      child: Consumer(
        builder: (context, ref, child) {
          // GoRouter provider를 구독 → 인증 상태가 바뀌면 자동으로 라우트 변경
          final goRouter = ref.watch(goRouterProvider);

          return MaterialApp.router(
            title: 'Mingun',
            theme: AppTheme.lightTheme, // 앱 전체 테마 (색상, 폰트 등)
            routerConfig: goRouter, // GoRouter 라우팅 설정
            // 웹 환경에서 키보드 관련 assertion 에러 방지용 처리
            builder: (context, child) {
              if (kIsWeb) {
                return MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    viewInsets: MediaQuery.of(context).viewInsets,
                  ),
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
