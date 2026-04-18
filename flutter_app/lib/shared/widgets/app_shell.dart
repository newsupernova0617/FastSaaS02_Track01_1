import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/shared/widgets/glow_nav_bar.dart';

// ============================================================
// [Phase 3] app_shell.dart
// Replaces BottomNavShell. Hosts the 5-slot GlowNavBar with a
// center AI FAB. Tabs: Home / Calendar / (FAB→Chat) / Stats / Settings.
//
// Unlike Material's Scaffold.bottomNavigationBar, the nav bar here
// floats above the body so pages can draw into the full screen.
// ============================================================

class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  static const List<GlowNavItem> _items = [
    GlowNavItem(
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
      label: 'Home',
    ),
    GlowNavItem(
      icon: Icons.calendar_month_outlined,
      selectedIcon: Icons.calendar_month_rounded,
      label: 'Calendar',
    ),
    GlowNavItem(
      icon: Icons.auto_graph_outlined,
      selectedIcon: Icons.auto_graph_rounded,
      label: 'Stats',
    ),
    GlowNavItem(
      icon: Icons.settings_outlined,
      selectedIcon: Icons.settings_rounded,
      label: 'Settings',
    ),
  ];

  int _indexFor(String location) {
    if (location.startsWith('/home')) return 0;
    if (location.startsWith('/calendar')) return 1;
    if (location.startsWith('/stats')) return 2;
    if (location.startsWith('/settings')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final location = GoRouterState.of(context).uri.path;
    final index = _indexFor(location);

    return Scaffold(
      extendBody: true,
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Page content with bottom padding so nav bar doesn't overlap.
          // 104 = nav bar widget(~72) + 외부 margin(12) + shadow 가상 높이(~20).
          // AdBanner(50dp)나 Chat input pill이 nav bar 그림자에 가리지 않도록 여유.
          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.only(
                bottom: 104 + MediaQuery.of(context).padding.bottom,
              ),
              child: child,
            ),
          ),
          // Floating nav bar.
          Align(
            alignment: Alignment.bottomCenter,
            child: GlowNavBar(
              currentIndex: index,
              items: _items,
              onAiTap: () => context.push('/chat'),
              onTap: (i) {
                switch (i) {
                  case 0:
                    context.go('/home');
                    break;
                  case 1:
                    context.go('/calendar');
                    break;
                  case 2:
                    context.go('/stats');
                    break;
                  case 3:
                    context.go('/settings');
                    break;
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
