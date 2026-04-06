import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Shell widget that provides bottom navigation for authenticated routes
/// Maintains bottom nav state across navigation while using ShellRoute
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
    if (location.startsWith('/ai')) return 3;
    return 0; // Default to record page
  }

  @override
  Widget build(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    final int selectedIndex = _getSelectedIndex(location);

    return Scaffold(
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
              context.go('/ai');
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
            icon: Icon(Icons.smart_toy_outlined),
            selectedIcon: Icon(Icons.smart_toy),
            label: 'AI',
          ),
        ],
      ),
    );
  }
}
