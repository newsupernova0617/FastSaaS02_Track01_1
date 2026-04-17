import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            isScrollControlled: false,
          );
        },
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.grey[300] ?? Colors.grey,
              width: 2,
            ),
          ),
          child: ClipOval(
            child: avatarUrl != null && avatarUrl.isNotEmpty
                ? Image.network(
                    avatarUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return _buildAvatarFallback(name);
                    },
                  )
                : _buildAvatarFallback(name),
          ),
        ),
      ),
    );
  }

  /// Build avatar fallback with initials
  Widget _buildAvatarFallback(String name) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      color: Colors.grey[200],
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
      ),
    );
  }
}
