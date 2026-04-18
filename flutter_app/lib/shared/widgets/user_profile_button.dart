import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/widgets/user_profile_sheet.dart';

// ============================================================
// [공유 위젯] user_profile_button.dart
// AppBar 우측에 표시되는 프로필 아바타 버튼입니다.
// 구글 로그인 시 프로필 사진이 표시되고, 없으면 이름 첫 글자가 표시됩니다.
// 탭하면 UserProfileSheet(프로필 시트)가 하단에서 올라옵니다.
// ============================================================
class UserProfileButton extends ConsumerWidget {
  const UserProfileButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final isAuthenticated = ref.watch(isAuthenticatedProvider);

    // Only show if user is authenticated
    if (!isAuthenticated || currentUser == null) {
      return const SizedBox.shrink();
    }

    final name = currentUser.userMetadata?['name'] as String? ?? currentUser.email ?? 'User';
    final avatarUrl = currentUser.userMetadata?['avatar_url'] as String?;

    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: GestureDetector(
        onTap: () {
          showModalBottomSheet(
            context: context,
            builder: (context) => const UserProfileSheet(),
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            // 다크 모드 토글 + 설정 + 로그아웃 버튼이 있어 콘텐츠가 기본
            // 바텀시트 최대 높이(screen × 9/16)를 초과하면 잘린다. true로
            // 풀어 콘텐츠 크기만큼 늘릴 수 있게 하고, 시트 내부에서는
            // SingleChildScrollView로 과도한 길이에 대비.
            isScrollControlled: true,
          );
        },
        child: Container(
          width: 40,
          height: 40,
          padding: const EdgeInsets.all(2),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppGradients.brand,
          ),
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Theme.of(context).colorScheme.surface,
            ),
            padding: const EdgeInsets.all(1),
            child: ClipOval(
              child: avatarUrl != null && avatarUrl.isNotEmpty
                  ? Image.network(
                      avatarUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _buildAvatarFallback(name, context);
                      },
                    )
                  : _buildAvatarFallback(name, context),
            ),
          ),
        ),
      ),
    );
  }

  /// Build avatar fallback with initials (Phase 3: violet tint + theme-aware)
  Widget _buildAvatarFallback(String name, BuildContext context) {
    final theme = Theme.of(context);
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      color: theme.colorScheme.primary.withValues(alpha: 0.12),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: theme.colorScheme.primary,
          ),
        ),
      ),
    );
  }
}
