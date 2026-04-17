import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/features/chat/widgets/session_sidebar.dart';
import 'package:flutter_app/features/chat/providers/session_provider.dart';
import 'package:flutter_app/shared/providers/chat_provider.dart';
import 'package:flutter_app/shared/models/chat_message.dart';

// ============================================================
// [세션 채팅 화면] chat_screen.dart
// AI와 세션 기반으로 대화하는 메인 채팅 화면입니다. (하단탭 4번)
//
// 레이아웃:
//   [데스크톱/태블릿] 왼쪽 사이드바(세션 목록) + 오른쪽 채팅 영역
//   [모바일] 채팅 영역만 표시, 메뉴 버튼으로 세션 목록 바텀시트
//
// 채팅 동작:
//   1) 메시지 입력 → 옵티미스틱 UI (서버 응답 전에 즉시 표시)
//   2) sendChatMessageProvider로 서버에 전송
//   3) 서버 응답 후 chatMessagesProvider 새로고침
//   4) AI 응답에 actionType이 있으면 액션 버튼 표시
//      (예: 'create' → "기록 보기", 'report' → "리포트 보기")
//
// 세션 관리:
//   - 새 대화 생성: createSessionProvider
//   - 세션 삭제: deleteSessionProvider
//   - 활성 세션: activeSessionIdProvider (StateProvider)
// ============================================================
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;
  bool _isInputEmpty = true;
  final List<ChatMessage> _optimisticMessages = [];

  @override
  void initState() {
    super.initState();
    // Listen to text changes to update button state
    _messageController.addListener(_updateButtonState);
  }

  void _updateButtonState() {
    setState(() {
      _isInputEmpty = _messageController.text.trim().isEmpty;
    });
  }

  @override
  void dispose() {
    _messageController.removeListener(_updateButtonState);
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _createNewSession() async {
    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('New Conversation'),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'Enter a title for this conversation',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  Navigator.pop(context, controller.text);
                }
              },
              child: const Text('Create'),
            ),
          ],
        );
      },
    );

    if (result != null && mounted) {
      try {
        final sessionId = await ref
            .read(createSessionProvider(result).future);
        ref.read(activeSessionIdProvider.notifier).state = sessionId;
        _messageController.clear();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    }
  }

  Future<void> _deleteSession(int sessionId) async {
    try {
      await ref.read(deleteSessionProvider(sessionId).future);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session deleted')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _sendMessage(String text) async {
    if (text.isEmpty) return;

    final activeSessionId = ref.read(activeSessionIdProvider);

    if (activeSessionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or create a session first')),
      );
      return;
    }

    // Create optimistic user message (show immediately)
    final userMessage = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch,
      userId: '',
      role: 'user',
      content: text,
      metadata: null,
      createdAt: DateTime.now().toIso8601String(),
    );

    setState(() {
      _optimisticMessages.add(userMessage);
      _isSending = true;
    });

    // Clear input immediately
    _messageController.clear();
    _isInputEmpty = true;

    // Scroll to show the loading bubble immediately
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });

    try {
      await ref.read(
        sendChatMessageProvider((text, activeSessionId)).future,
      );

      // Refresh messages from server (will include user message + AI response)
      ref.refresh(chatMessagesProvider(activeSessionId));

      _optimisticMessages.clear();

      Future.delayed(const Duration(milliseconds: 100), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
        // Remove optimistic message on error
        setState(() {
          _optimisticMessages.removeWhere((m) => m.id == userMessage.id);
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionsAsync = ref.watch(sessionProvider);
    final activeSessionId = ref.watch(activeSessionIdProvider);
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final isTablet = screenWidth < 1000;

    return Scaffold(
      body: Row(
        children: [
          // Left sidebar with sessions - hide on mobile, responsive on tablet
          if (!isMobile)
            SizedBox(
              width: isTablet ? 250 : 300,
              child: sessionsAsync.when(
                data: (sessions) => SessionSidebar(
                  activeSessionId: activeSessionId,
                  onSessionSelect: (sessionId) {
                    ref.read(activeSessionIdProvider.notifier).state = sessionId;
                    _messageController.clear();
                    _isInputEmpty = true;
                  },
                  onNewSession: _createNewSession,
                  onDeleteSession: _deleteSession,
                  sessions: sessions,
                  isLoading: false,
                ),
                loading: () => SessionSidebar(
                  activeSessionId: null,
                  onSessionSelect: (_) {},
                  onNewSession: () {},
                  onDeleteSession: (_) {},
                  sessions: const [],
                  isLoading: true,
                ),
                error: (err, stack) => SessionSidebar(
                  activeSessionId: null,
                  onSessionSelect: (_) {},
                  onNewSession: _createNewSession,
                  onDeleteSession: (_) {},
                  sessions: [],
                  isLoading: false,
                ),
              ),
            ),

          // Chat area
          Expanded(
            child: activeSessionId == null
                ? _buildEmptyState()
                : _buildChatArea(
                    activeSessionId,
                    isMobile,
                    sessionsAsync,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.chat_outlined,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          const Text('No conversation selected'),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _createNewSession,
            icon: const Icon(Icons.add),
            label: const Text('Start New Conversation'),
          ),
        ],
      ),
    );
  }

  Widget _buildChatArea(
    int activeSessionId,
    bool isMobile,
    AsyncValue<List<SessionItem>> sessionsAsync,
  ) {
    return Column(
      children: [
        // Header with session info and mobile menu
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Colors.grey[300]!),
            ),
          ),
          child: Row(
            children: [
              if (isMobile)
                IconButton(
                  icon: const Icon(Icons.menu),
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      builder: (context) => sessionsAsync.when(
                        data: (sessions) => SessionSidebar(
                          activeSessionId: activeSessionId,
                          onSessionSelect: (sessionId) {
                            ref.read(activeSessionIdProvider.notifier).state =
                                sessionId;
                            _messageController.clear();
                            _isInputEmpty = true;
                            Navigator.pop(context);
                          },
                          onNewSession: () {
                            Navigator.pop(context);
                            _createNewSession();
                          },
                          onDeleteSession: (sessionId) {
                            Navigator.pop(context);
                            _deleteSession(sessionId);
                          },
                          sessions: sessions,
                          isLoading: false,
                        ),
                        loading: () => const Padding(
                          padding: EdgeInsets.all(16),
                          child: CircularProgressIndicator(),
                        ),
                        error: (err, stack) => Center(
                          child: Text('Error: $err'),
                        ),
                      ),
                    );
                  },
                ),
              Expanded(
                child: Text(
                  'Chat Session',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ],
          ),
        ),

        // Chat messages
        Expanded(
          child: Consumer(
            builder: (context, ref, child) {
              final messagesAsync =
                  ref.watch(chatMessagesProvider(activeSessionId));

              return messagesAsync.when(
                data: (messages) {
                  // Combine server messages with optimistic messages
                  final allMessages = [...messages, ..._optimisticMessages];

                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: allMessages.length + (_isSending ? 1 : 0),
                    itemBuilder: (context, index) {
                      // Show loading bubble while waiting for AI response
                      if (_isSending && index == allMessages.length) {
                        return _buildLoadingBubble();
                      }
                      final msg = allMessages[index];
                      return _buildChatBubble(msg);
                    },
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (err, stack) => Center(
                  child: Text('Error: $err'),
                ),
              );
            },
          ),
        ),

        // Input area
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: Colors.grey[300]!),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    hintText: 'Type a message...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                  ),
                  maxLines: null,
                  minLines: 1,
                  enabled: !_isSending,
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: (_isSending || _isInputEmpty)
                    ? null
                    : () => _sendMessage(
                          _messageController.text.trim(),
                        ),
                child: _isSending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.send),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildChatBubble(ChatMessage msg) {
    final isUser = msg.role == 'user';
    final screenWidth = MediaQuery.of(context).size.width;
    final maxBubbleWidth = screenWidth * 0.75;
    final actionType = msg.metadata?['actionType'] as String?;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: maxBubbleWidth),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isUser ? AppTheme.primaryColor : Colors.grey[200],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment:
              isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              msg.content,
              style: TextStyle(
                color: isUser ? Colors.white : Colors.black,
              ),
            ),
            // Show action buttons for AI responses
            if (!isUser && actionType != null) ...[
              const SizedBox(height: 8),
              _buildActionButtons(actionType, msg.metadata),
            ],
            const SizedBox(height: 4),
            Text(
              msg.createdAt,
              style: TextStyle(
                color: isUser ? Colors.white70 : Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(String actionType, Map<String, dynamic>? metadata) {
    switch (actionType) {
      case 'create':
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              // Navigate to record/calendar to see the created transaction
              context.go('/record');
            },
            icon: const Icon(Icons.check_circle, size: 16),
            label: const Text('View Created', style: TextStyle(fontSize: 12)),
          ),
        );

      case 'delete':
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              context.go('/record');
            },
            icon: const Icon(Icons.done, size: 16),
            label: const Text('View Updated', style: TextStyle(fontSize: 12)),
          ),
        );

      case 'read':
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              // Stay in chat or navigate to calendar
              context.go('/calendar');
            },
            icon: const Icon(Icons.calendar_today, size: 16),
            label: const Text('View in Calendar', style: TextStyle(fontSize: 12)),
          ),
        );

      case 'report':
        final report = metadata?['report'];
        if (report != null && report is Map<String, dynamic>) {
          final reportId = report['id'];
          return SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                // Navigate to report detail
                context.go('/report/$reportId');
              },
              icon: const Icon(Icons.bar_chart, size: 16),
              label: const Text('View Report', style: TextStyle(fontSize: 12)),
            ),
          );
        }
        return const SizedBox.shrink();

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildLoadingBubble() {
    final screenWidth = MediaQuery.of(context).size.width;
    final maxBubbleWidth = screenWidth * 0.75;

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: maxBubbleWidth),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 8),
            Text(
              '잠시만 기다려 주세요...',
              style: TextStyle(color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }
}
