import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/features/chat/providers/session_provider.dart';

// ============================================================
// [채팅 위젯] session_sidebar.dart
// 채팅 화면 왼쪽의 세션(대화방) 목록 사이드바입니다.
// 어두운 배경(grey[900])으로 디자인되어 있습니다.
//
// 기능:
//   - "New Conversation" 버튼으로 새 세션 생성
//   - 세션 목록 표시 (제목, 생성 시간)
//   - 활성 세션 하이라이트 (배경색 변경)
//   - 세션 삭제 (삭제 확인 다이얼로그)
//   - 세션 이름 변경 (이름 변경 다이얼로그)
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

  void _showSessionMenu(
    BuildContext context,
    SessionItem session,
  ) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('Rename'),
              onTap: () {
                Navigator.pop(context);
                _showRenameDialog(context, session);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('Delete', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                _showDeleteConfirmation(context, session);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showRenameDialog(BuildContext context, SessionItem session) {
    final controller = TextEditingController(text: session.title);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename Session'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'New session name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                // onRenameSession would be called from parent
                Navigator.pop(context);
              }
            },
            child: const Text('Rename'),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(BuildContext context, SessionItem session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Session?'),
        content: const Text(
          'This will permanently delete the session and all its messages. This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              onDeleteSession?.call(session.id);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${dateTime.month}/${dateTime.day}';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      width: 280,
      color: Colors.grey[900],
      child: Column(
        children: [
          // Header with "New Conversation" button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.grey[800]!),
              ),
            ),
            child: ElevatedButton.icon(
              onPressed: onNewSession,
              icon: const Icon(Icons.add),
              label: const Text('New Conversation'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 50),
                backgroundColor: AppTheme.primaryColor,
              ),
            ),
          ),

          // Sessions list
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : sessions.isEmpty
                    ? Center(
                        child: Text(
                          'No conversations yet',
                          style: TextStyle(color: Colors.grey[400]),
                        ),
                      )
                    : ListView.builder(
                        itemCount: sessions.length,
                        itemBuilder: (context, index) {
                          final session = sessions[index];
                          final isActive = activeSessionId == session.id;

                          return Container(
                            color: isActive ? Colors.grey[800] : Colors.transparent,
                            child: ListTile(
                              title: Text(
                                session.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isActive
                                      ? AppTheme.primaryColor
                                      : Colors.grey[200],
                                ),
                              ),
                              subtitle: Text(
                                _formatDate(session.createdAt),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[500],
                                ),
                              ),
                              onTap: () => onSessionSelect(session.id),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete, color: Colors.red, size: 18),
                                onPressed: () => _showDeleteConfirmation(context, session),
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                padding: EdgeInsets.zero,
                              ),
                              dense: true,
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
