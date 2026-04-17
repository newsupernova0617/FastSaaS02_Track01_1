import 'package:flutter/widgets.dart';

import 'quick_entry_handler.dart';

// ============================================================
// [빠른입력 엔트리포인트] quick_entry_main.dart
// 앱 프로세스가 죽어있을 때 Android가 별도의 Dart 엔진을 띄워
// 이 함수를 실행합니다.
//
// 실행 흐름:
//   1) Android QuickEntryReceiver가 FlutterEngineGroup으로 Dart 엔진 생성
//   2) 이 함수가 호출됨 → 바인딩 초기화 + 빠른입력 핸들러 설치
//   3) Kotlin이 MethodChannel로 'onQuickEntrySubmit' 호출
//   4) quick_entry_handler가 서버에 메시지 전송 + 결과 알림
//   5) Kotlin이 엔진을 파괴
//
// @pragma('vm:entry-point') — Dart 트리셰이킹에서 이 함수를 제거하지 않도록 표시
// ============================================================
@pragma('vm:entry-point')
void quickEntryMain() {
  WidgetsFlutterBinding.ensureInitialized();
  installQuickEntryHandler();
}
