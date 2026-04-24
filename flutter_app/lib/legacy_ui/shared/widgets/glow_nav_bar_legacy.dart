import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/widgets/ai_fab.dart';

// ============================================================
// [Phase 3] glow_nav_bar.dart
// Floating pill-shaped navigation with a center AI FAB.
// 5 slots: [home, calendar, <FAB>, stats, settings].
// Active tab shows a pulsing violet dot indicator under the icon.
// ============================================================

class GlowNavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const GlowNavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}

class GlowNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback onAiTap;
  final List<GlowNavItem> items; // must be length 4 (two each side of FAB)

  const GlowNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.onAiTap,
    required this.items,
  }) : assert(items.length == 4, 'GlowNavBar expects exactly 4 side items');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          bottom: bottomInset > 0 ? 0 : AppSpacing.md,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppRadii.pill),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.surface.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(AppRadii.pill),
                border: Border.all(
                  color: theme.colorScheme.outline.withValues(alpha: 0.4),
                  width: 0.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.25),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _NavSlot(
                    item: items[0],
                    selected: currentIndex == 0,
                    onTap: () => _handleTap(0),
                  ),
                  _NavSlot(
                    item: items[1],
                    selected: currentIndex == 1,
                    onTap: () => _handleTap(1),
                  ),
                  AiFab(onTap: onAiTap),
                  _NavSlot(
                    item: items[2],
                    selected: currentIndex == 2,
                    onTap: () => _handleTap(2),
                  ),
                  _NavSlot(
                    item: items[3],
                    selected: currentIndex == 3,
                    onTap: () => _handleTap(3),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _handleTap(int index) {
    HapticFeedback.selectionClick();
    onTap(index);
  }
}

class _NavSlot extends StatelessWidget {
  final GlowNavItem item;
  final bool selected;
  final VoidCallback onTap;

  const _NavSlot({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = selected
        ? AppColors.primary
        : theme.colorScheme.onSurface.withValues(alpha: 0.55);

    return Expanded(
      child: InkResponse(
        onTap: onTap,
        radius: 32,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(selected ? item.selectedIcon : item.icon, size: 22, color: color),
              const SizedBox(height: 4),
              AnimatedContainer(
                duration: AppMotion.fast,
                curve: AppMotion.emphasized,
                width: selected ? 16 : 0,
                height: 3,
                decoration: BoxDecoration(
                  gradient: selected ? AppGradients.brand : null,
                  borderRadius: BorderRadius.circular(2),
                  boxShadow: selected ? AppGlow.small() : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
