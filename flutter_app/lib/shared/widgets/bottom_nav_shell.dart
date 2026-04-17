import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/shared/widgets/user_profile_button.dart';

// ============================================================
// [공유 위젯] bottom_nav_shell.dart
// 로그인 후 모든 메인 화면의 "껍데기" 역할을 하는 위젯입니다.
// GoRouter의 ShellRoute로 감싸져서 하단 네비게이션바를 공유합니다.
//
// 구조:
//   AppBar (상단바 — 프로필 버튼)
//   body (자식 화면 — RecordPage, CalendarPage 등이 여기에 표시)
//   NavigationBar (하단 네비게이션 — 기록, 달력, 통계, Chat)
//
// URL 경로에 따라 하단 탭의 선택 상태가 자동으로 바뀝니다.
// ============================================================
class BottomNavShell extends StatefulWidget {
  final Widget child;

  const BottomNavShell({
    super.key,
    required this.child,
  });

  @override
  State<BottomNavShell> createState() => _BottomNavShellState();
}

class _BottomNavShellState extends State<BottomNavShell> {
  /// Get the current route name from the location
  /// Used to determine which nav item should be highlighted
  int _getSelectedIndex(String location) {
    if (location.startsWith('/record')) return 0;
    if (location.startsWith('/calendar')) return 1;
    if (location.startsWith('/stats')) return 2;
    if (location.startsWith('/chat')) return 3;
    return 0; // Default to record page
  }

  @override
  Widget build(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    final int selectedIndex = _getSelectedIndex(location);

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: const [
          UserProfileButton(),
        ],
      ),
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (int index) {
          switch (index) {
            case 0:
              context.go('/record');
              break;
            case 1:
              context.go('/calendar');
              break;
            case 2:
              context.go('/stats');
              break;
            case 3:
              context.go('/chat');
              break;
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: '기록',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: '달력',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart),
            label: '통계',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_outlined),
            selectedIcon: Icon(Icons.chat),
            label: 'Chat',
          ),
        ],
      ),
    );
  }
}
