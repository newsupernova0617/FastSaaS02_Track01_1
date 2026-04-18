import 'package:flutter/material.dart';
import 'package:flutter_chat_types/flutter_chat_types.dart' as types;
import 'package:flutter_chat_ui/flutter_chat_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/features/ai_chat/widgets/chat_input.dart';
import 'package:flutter_app/features/chat/adapters/chat_ui_adapter.dart';
import 'package:flutter_app/features/chat/widgets/session_sidebar.dart';
import 'package:flutter_app/features/chat/providers/session_provider.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/providers/chat_provider.dart';
import 'package:flutter_app/shared/widgets/empty_state.dart';

// ============================================================
// [세션 채팅 화면] chat_screen.dart
// flutter_chat_ui 기반 AI 세션 채팅.
// ============================================================
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  bool _isSending = false;
  final List<types.Message> _optimistic = [];

  Future<void> _createNewSession() async {
    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('새 대화 시작'),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: '대화 제목을 입력하세요',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  Navigator.pop(context, controller.text);
                }
              },
              child: const Text('생성'),
            ),
          ],
        );
      },
    );

    if (result != null && mounted) {
      try {
        final sessionId =
            await ref.read(createSessionProvider(result).future);
        ref.read(activeSessionIdProvider.notifier).state = sessionId;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('오류: $e')),
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
          const SnackBar(content: Text('대화가 삭제되었습니다')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('오류: $e')),
        );
      }
    }
  }

  Future<void> _handleSend(types.PartialText partial, int sessionId) async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final text = partial.text.trim();
    if (text.isEmpty) return;

    final optimistic = ChatUIAdapter.optimisticUserMessage(
      currentUserId: user.id,
      text: text,
    );

    setState(() {
      _optimistic.insert(0, optimistic);
      _isSending = true;
    });

    try {
      await ref.read(sendChatMessageProvider((text, sessionId)).future);
      // 서버에서 최신 메시지(사용자 + AI) 새로고침됨
      ref.invalidate(chatMessagesProvider(sessionId));
      setState(() {
        _optimistic.remove(optimistic);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('전송 실패: $e')),
        );
        setState(() {
          _optimistic.remove(optimistic);
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
          if (!isMobile)
            SizedBox(
              width: isTablet ? 250 : 300,
              child: sessionsAsync.when(
                data: (sessions) => SessionSidebar(
                  activeSessionId: activeSessionId,
                  onSessionSelect: (sessionId) {
                    ref.read(activeSessionIdProvider.notifier).state = sessionId;
                    _optimistic.clear();
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
                error: (err, _) => SessionSidebar(
                  activeSessionId: null,
                  onSessionSelect: (_) {},
                  onNewSession: _createNewSession,
                  onDeleteSession: (_) {},
                  sessions: const [],
                  isLoading: false,
                ),
              ),
            ),

          Expanded(
            child: activeSessionId == null
                ? _buildEmpty()
                : _buildChatArea(activeSessionId, isMobile, sessionsAsync),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return EmptyState(
      icon: Icons.chat_outlined,
      title: '선택된 대화가 없습니다',
      subtitle: '새 대화를 시작해 AI와 대화해 보세요',
      actionLabel: '새 대화 시작',
      onAction: _createNewSession,
    );
  }

  Widget _buildChatArea(
    int activeSessionId,
    bool isMobile,
    AsyncValue<List<SessionItem>> sessionsAsync,
  ) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final currentUserId = user?.id ?? 'me';

    return Column(
      children: [
        _buildHeader(isMobile, activeSessionId, sessionsAsync),
        Expanded(
          child: Consumer(
            builder: (context, ref, _) {
              final messagesAsync =
                  ref.watch(chatMessagesProvider(activeSessionId));

              return messagesAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (err, _) => EmptyState(
                  icon: Icons.error_outline,
                  title: '메시지를 불러오지 못했습니다',
                  subtitle: err.toString(),
                  actionLabel: '재시도',
                  onAction: () =>
                      ref.invalidate(chatMessagesProvider(activeSessionId)),
                ),
                data: (serverMessages) {
                  final uiMessages = [
                    ..._optimistic,
                    ...serverMessages.reversed.map(
                      (m) => ChatUIAdapter.toUiMessage(
                        m,
                        currentUserId: currentUserId,
                      ),
                    ),
                  ];

                  return Chat(
                    messages: uiMessages,
                    onSendPressed: (partial) =>
                        _handleSend(partial, activeSessionId),
                    user: ChatUIAdapter.currentUser(userId: currentUserId),
                    showUserAvatars: true,
                    showUserNames: true,
                    theme: _buildChatTheme(theme),
                    l10n: const ChatL10nEn(
                      inputPlaceholder: '메시지를 입력하세요...',
                      emptyChatPlaceholder: '첫 메시지를 보내 AI와 대화를 시작하세요',
                      attachmentButtonAccessibilityLabel: '첨부',
                      sendButtonAccessibilityLabel: '전송',
                      unreadMessagesLabel: '읽지 않은 메시지',
                    ),
                    typingIndicatorOptions: TypingIndicatorOptions(
                      typingUsers:
                          _isSending ? [ChatUIAdapter.aiUser()] : const [],
                    ),
                    customMessageBuilder:
                        (message, {required int messageWidth}) =>
                            _buildCustomMessage(message, messageWidth),
                    // Phase 3 ChatInput 재사용 — glass pill + violet focus glow
                    // + gradient 전송 버튼 + haptic. flutter_chat_ui 기본 입력창 대체.
                    customBottomWidget: ChatInput(
                      isLoading: _isSending,
                      onSend: (text) => _handleSend(
                        types.PartialText(text: text),
                        activeSessionId,
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildHeader(
    bool isMobile,
    int activeSessionId,
    AsyncValue<List<SessionItem>> sessionsAsync,
  ) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          bottom:
              BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.25)),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              tooltip: '돌아가기',
              onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
            ),
            if (isMobile)
              IconButton(
                icon: const Icon(Icons.menu_rounded),
                tooltip: '대화 목록',
                onPressed: () => _showSessionsSheet(activeSessionId, sessionsAsync),
              ),
            Container(
              width: 28,
              height: 28,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              decoration: BoxDecoration(
                gradient: AppGradients.brand,
                shape: BoxShape.circle,
                boxShadow: AppGlow.small(),
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _currentSessionTitle(activeSessionId, sessionsAsync),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isSending ? 'AI 응답 중…' : 'AI 준비 완료',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.55),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _currentSessionTitle(
    int activeSessionId,
    AsyncValue<List<SessionItem>> sessionsAsync,
  ) {
    return sessionsAsync.maybeWhen(
      data: (sessions) {
        final match = sessions.where((s) => s.id == activeSessionId).toList();
        if (match.isEmpty) return '대화';
        return match.first.title;
      },
      orElse: () => '대화',
    );
  }

  void _showSessionsSheet(
    int activeSessionId,
    AsyncValue<List<SessionItem>> sessionsAsync,
  ) {
    showModalBottomSheet(
      context: context,
      builder: (context) => sessionsAsync.when(
        data: (sessions) => SessionSidebar(
          activeSessionId: activeSessionId,
          onSessionSelect: (sessionId) {
            ref.read(activeSessionIdProvider.notifier).state = sessionId;
            _optimistic.clear();
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
          padding: EdgeInsets.all(AppSpacing.lg),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (err, _) => Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Text('오류: $err'),
        ),
      ),
    );
  }

  // ─── Custom message builder (액션 메시지) ─────────────────────
  Widget _buildCustomMessage(types.CustomMessage message, int messageWidth) {
    final theme = Theme.of(context);
    final metadata = message.metadata ?? {};
    final text = (metadata['text'] as String?) ?? '';
    final actionType = metadata['actionType'] as String?;

    final isUser = message.author.id != ChatUIAdapter.aiUserId;
    final bubbleColor = isUser
        ? theme.colorScheme.primary
        : theme.colorScheme.surfaceContainerHighest;
    final textColor = isUser
        ? Colors.white
        : theme.colorScheme.onSurface;

    return Container(
      constraints: BoxConstraints(maxWidth: messageWidth.toDouble()),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: bubbleColor,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Column(
        crossAxisAlignment:
            isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (text.isNotEmpty)
            Text(
              text,
              style: theme.textTheme.bodyMedium?.copyWith(color: textColor),
            ),
          if (actionType != null) ...[
            const SizedBox(height: AppSpacing.sm),
            _buildActionButton(actionType, metadata),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButton(String actionType, Map<String, dynamic> metadata) {
    switch (actionType) {
      case 'create':
        return _actionBtn(
          icon: Icons.check_circle_outline,
          label: '기록 보기',
          onTap: () => context.go('/record'),
        );
      case 'delete':
        return _actionBtn(
          icon: Icons.done,
          label: '변경 확인',
          onTap: () => context.go('/record'),
        );
      case 'read':
        return _actionBtn(
          icon: Icons.calendar_today,
          label: '달력에서 보기',
          onTap: () => context.go('/calendar'),
        );
      case 'report':
        final report = metadata['report'];
        if (report is Map<String, dynamic> && report['id'] != null) {
          final reportId = report['id'];
          return _actionBtn(
            icon: Icons.bar_chart,
            label: '리포트 보기',
            onTap: () => context.go('/report/$reportId'),
          );
        }
        return const SizedBox.shrink();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _actionBtn({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 16),
        label: Text(label),
      ),
    );
  }

  // ─── Theme 빌더 (라이트/다크) ─────────────────────────────────
  ChatTheme _buildChatTheme(ThemeData theme) {
    final isDark = theme.brightness == Brightness.dark;
    final sentTextStyle = const TextStyle(
      color: Colors.white,
      fontSize: 14,
      height: 1.4,
      fontWeight: FontWeight.w500,
    );
    final receivedTextStyle = TextStyle(
      color: theme.colorScheme.onSurface,
      fontSize: 14,
      height: 1.4,
      fontWeight: FontWeight.w500,
    );
    final inputBorderRadius = const BorderRadius.all(
      Radius.circular(AppRadii.md),
    );

    // 입력창은 customBottomWidget (ChatInput) 이 실제로 렌더하므로
    // 아래 inputBackgroundColor / inputTextColor 는 fallback 값일 뿐이다.
    final inputBg = isDark
        ? theme.colorScheme.surfaceContainerHighest
        : Colors.white;
    final inputFg = isDark ? theme.colorScheme.onSurface : Colors.black;
    final inputStyle = TextStyle(
      fontSize: 14,
      height: 1.4,
      color: inputFg,
    );

    if (isDark) {
      return DarkChatTheme(
        backgroundColor: theme.scaffoldBackgroundColor,
        primaryColor: theme.colorScheme.primary,
        secondaryColor: theme.colorScheme.surfaceContainerHighest,
        inputBackgroundColor: inputBg,
        inputTextColor: inputFg,
        inputBorderRadius: inputBorderRadius,
        messageBorderRadius: AppRadii.md,
        sentMessageBodyTextStyle: sentTextStyle,
        receivedMessageBodyTextStyle: receivedTextStyle,
        inputTextStyle: inputStyle,
      );
    }

    return DefaultChatTheme(
      backgroundColor: theme.scaffoldBackgroundColor,
      primaryColor: theme.colorScheme.primary,
      secondaryColor: theme.colorScheme.surfaceContainerHighest,
      inputBackgroundColor: inputBg,
      inputTextColor: inputFg,
      inputBorderRadius: inputBorderRadius,
      messageBorderRadius: AppRadii.md,
      sentMessageBodyTextStyle: sentTextStyle,
      receivedMessageBodyTextStyle: receivedTextStyle,
      inputTextStyle: inputStyle,
    );
  }
}
