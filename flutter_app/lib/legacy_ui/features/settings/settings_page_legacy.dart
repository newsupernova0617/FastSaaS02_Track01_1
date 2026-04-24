import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/providers/theme_provider.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';

// ============================================================
// [설정 화면] settings_page.dart
// 테마 모드 / 계정 / 앱 정보 관리.
// ============================================================
class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final themeMode = ref.watch(themeModeProvider);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('설정'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          if (user != null) _buildAccountCard(theme, user),
          const SizedBox(height: AppSpacing.lg),

          _sectionTitle(theme, '디스플레이'),
          const SizedBox(height: AppSpacing.sm),
          _buildThemeCard(context, ref, themeMode, theme),
          const SizedBox(height: AppSpacing.lg),

          _sectionTitle(theme, '정보'),
          const SizedBox(height: AppSpacing.sm),
          _buildInfoCard(context, theme),
          const SizedBox(height: AppSpacing.xl),

          _buildLogoutButton(context, ref),
        ],
      ),
    );
  }

  Widget _sectionTitle(ThemeData theme, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
      child: Text(
        title,
        style: theme.textTheme.titleSmall?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildAccountCard(ThemeData theme, dynamic user) {
    final email = user.email as String? ?? '';
    final name =
        (user.userMetadata?['name'] as String?) ?? email;
    final avatarUrl = user.userMetadata?['avatar_url'] as String?;

    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Row(
        children: [
          if (avatarUrl != null && avatarUrl.isNotEmpty)
            ClipOval(
              child: Image.network(
                avatarUrl,
                width: 52,
                height: 52,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _avatarFallback(name, theme),
              ),
            )
          else
            _avatarFallback(name, theme),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (email.isNotEmpty && email != name) ...[
                  const SizedBox(height: 2),
                  Text(
                    email,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatarFallback(String name, ThemeData theme) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.15),
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: theme.colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildThemeCard(
    BuildContext context,
    WidgetRef ref,
    ThemeMode current,
    ThemeData theme,
  ) {
    final items = <({ThemeMode mode, String label, IconData icon})>[
      (mode: ThemeMode.system, label: '시스템 설정', icon: Icons.brightness_auto),
      (mode: ThemeMode.light, label: '라이트', icon: Icons.light_mode),
      (mode: ThemeMode.dark, label: '다크', icon: Icons.dark_mode),
    ];

    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Column(
        children: items.map((item) {
          final selected = current == item.mode;
          return InkWell(
            borderRadius: BorderRadius.circular(AppRadii.md),
            onTap: () =>
                ref.read(themeModeProvider.notifier).setMode(item.mode),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                gradient: selected
                    ? LinearGradient(
                        colors: [
                          AppColors.primary.withValues(alpha: 0.16),
                          AppColors.secondary.withValues(alpha: 0.10),
                        ],
                      )
                    : null,
                borderRadius: BorderRadius.circular(AppRadii.md),
                border: selected
                    ? Border.all(
                        color: AppColors.primary.withValues(alpha: 0.35),
                        width: 0.5,
                      )
                    : null,
              ),
              child: Row(
                children: [
                  Icon(
                    item.icon,
                    color: selected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      item.label,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight:
                            selected ? FontWeight.w700 : FontWeight.w500,
                        color: selected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                  if (selected)
                    Icon(
                      Icons.check_circle_rounded,
                      color: theme.colorScheme.primary,
                      size: 20,
                    ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, ThemeData theme) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          ListTile(
            leading: FaIcon(
              FontAwesomeIcons.circleInfo,
              size: 18,
              color: theme.colorScheme.primary,
            ),
            title: const Text('앱 버전'),
            trailing: Text(
              '1.0.0',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ),
          Divider(
            height: 1,
            color: theme.colorScheme.outline.withValues(alpha: 0.4),
          ),
          ListTile(
            leading: FaIcon(
              FontAwesomeIcons.shield,
              size: 18,
              color: theme.colorScheme.primary,
            ),
            title: const Text('개인정보 처리방침'),
            trailing: Icon(
              Icons.arrow_forward_ios_rounded,
              size: 14,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
            ),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('준비 중입니다')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton.icon(
        onPressed: () async {
          try {
            await ref.read(signOutProvider.future);
            if (context.mounted) context.go('/login');
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('로그아웃 실패: $e')),
              );
            }
          }
        },
        icon: const Icon(Icons.logout, color: AppColors.expense),
        label: const Text(
          '로그아웃',
          style: TextStyle(
            color: AppColors.expense,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: AppColors.expense.withValues(alpha: 0.5)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
        ),
      ),
    );
  }
}
