import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/features/chat/providers/session_provider.dart';

// ============================================================
// [Phase 3] session_sidebar.dart
// 채팅 세션 목록 사이드바 — 다크 elevated 표면 + 활성 세션 gradient pill.
// ============================================================
class SessionSidebar extends ConsumerWidget {
  final int? activeSessionId;
  final Function(int) onSessionSelect;
  final Function() onNewSession;
  final Function(int)? onDeleteSession;
  final bool isLoading;
  final List<SessionItem> sessions;

  const SessionSidebar({
    super.key,
    required this.activeSessionId,
    required this.onSessionSelect,
    required this.onNewSession,
    this.onDeleteSession,
    required this.sessions,
    this.isLoading = false,
  });

  void _showDeleteConfirmation(BuildContext context, SessionItem session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('대화 삭제'),
        content: const Text(
          '대화와 모든 메시지가 영구 삭제됩니다. 되돌릴 수 없습니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              onDeleteSession?.call(session.id);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: AppColors.expense,
            ),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);
    if (diff.inMinutes < 60) return '${diff.inMinutes}분 전';
    if (diff.inHours < 24) return '${diff.inHours}시간 전';
    if (diff.inDays < 7) return '${diff.inDays}일 전';
    return '${dateTime.month}/${dateTime.day}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          right: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.4),
            width: 0.5,
          ),
        ),
      ),
      child: Column(
        children: [
          // Header — "New Conversation" gradient button
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppGradients.brand,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  boxShadow: AppGlow.small(),
                ),
                child: ElevatedButton.icon(
                  onPressed: onNewSession,
                  icon: const Icon(Icons.add_rounded,
                      size: 18, color: Colors.white),
                  label: const Text(
                    '새 대화',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadii.md),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Divider(
            height: 1,
            color: theme.colorScheme.outline.withValues(alpha: 0.4),
          ),

          // List
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : sessions.isEmpty
                    ? Center(
                        child: Text(
                          '아직 대화가 없어요',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.5),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.sm,
                        ),
                        itemCount: sessions.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 4),
                        itemBuilder: (context, index) {
                          final session = sessions[index];
                          final isActive = activeSessionId == session.id;
                          return _SessionTile(
                            session: session,
                            isActive: isActive,
                            formattedDate: _formatDate(session.createdAt),
                            onTap: () => onSessionSelect(session.id),
                            onDelete: onDeleteSession == null
                                ? null
                                : () => _showDeleteConfirmation(
                                    context, session),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _SessionTile extends StatelessWidget {
  final SessionItem session;
  final bool isActive;
  final String formattedDate;
  final VoidCallback onTap;
  final VoidCallback? onDelete;

  const _SessionTile({
    required this.session,
    required this.isActive,
    required this.formattedDate,
    required this.onTap,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.md),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary.withValues(alpha: 0.12)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(AppRadii.md),
            border: isActive
                ? Border.all(
                    color: AppColors.primary.withValues(alpha: 0.35),
                    width: 0.5,
                  )
                : null,
          ),
          child: Row(
            children: [
              if (isActive)
                Container(
                  width: 3,
                  height: 24,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    gradient: AppGradients.brand,
                    borderRadius: BorderRadius.circular(2),
                    boxShadow: AppGlow.small(),
                  ),
                ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      session.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: isActive
                            ? theme.colorScheme.onSurface
                            : theme.colorScheme.onSurface
                                .withValues(alpha: 0.85),
                        fontWeight:
                            isActive ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formattedDate,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ),
              if (onDelete != null)
                IconButton(
                  onPressed: onDelete,
                  icon: Icon(
                    Icons.delete_outline_rounded,
                    size: 18,
                    color:
                        theme.colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
                  tooltip: '대화 삭제',
                  constraints:
                      const BoxConstraints(minWidth: 32, minHeight: 32),
                  padding: EdgeInsets.zero,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
