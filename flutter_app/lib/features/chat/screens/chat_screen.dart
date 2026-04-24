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
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/providers/chat_provider.dart';
import 'package:flutter_app/shared/widgets/ai_search_result_card.dart';
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
            decoration: const InputDecoration(hintText: '대화 제목을 입력하세요'),
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
        final sessionId = await ref.read(createSessionProvider(result).future);
        ref.read(activeSessionIdProvider.notifier).state = sessionId;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('오류: $e')));
        }
      }
    }
  }

  Future<void> _deleteSession(int sessionId) async {
    try {
      await ref.read(deleteSessionProvider(sessionId).future);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('대화가 삭제되었습니다')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('오류: $e')));
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('전송 실패: $e')));
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
                    ref.read(activeSessionIdProvider.notifier).state =
                        sessionId;
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
              final messagesAsync = ref.watch(
                chatMessagesProvider(activeSessionId),
              );

              return messagesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
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
                      typingUsers: _isSending
                          ? [ChatUIAdapter.aiUser()]
                          : const [],
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
          bottom: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.25),
          ),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              tooltip: '돌아가기',
              onPressed: () =>
                  context.canPop() ? context.pop() : context.go('/home'),
            ),
            if (isMobile)
              IconButton(
                icon: const Icon(Icons.menu_rounded),
                tooltip: '대화 목록',
                onPressed: () =>
                    _showSessionsSheet(activeSessionId, sessionsAsync),
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
              child: const Icon(
                Icons.auto_awesome,
                color: Colors.white,
                size: 16,
              ),
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
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.55,
                          ),
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
    final textColor = isUser ? Colors.white : theme.colorScheme.onSurface;

    if (!isUser && actionType == 'read') {
      return SizedBox(
        width: messageWidth.toDouble(),
        child: _buildReadResultMessage(metadata, text),
      );
    }

    return Container(
      constraints: BoxConstraints(maxWidth: messageWidth.toDouble()),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: bubbleColor,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Column(
        crossAxisAlignment: isUser
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (text.isNotEmpty)
            Text(
              text,
              style: theme.textTheme.bodyMedium?.copyWith(color: textColor),
            ),
          if (actionType != null) ...[
            const SizedBox(height: AppSpacing.sm),
            if (actionType == 'read') _buildReadPreview(metadata, text),
            if (actionType == 'read') const SizedBox(height: AppSpacing.sm),
            _buildActionButton(actionType, metadata),
          ],
        ],
      ),
    );
  }

  Widget _buildReadResultMessage(Map<String, dynamic> metadata, String text) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.45),
          width: 0.6,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  gradient: AppGradients.brand,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                ),
                child: const Icon(
                  Icons.manage_search_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text('AI 검색 결과', style: theme.textTheme.titleMedium),
              ),
            ],
          ),
          if (text.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              text,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          _buildReadPreview(metadata, text),
        ],
      ),
    );
  }

  Widget _buildReadPreview(Map<String, dynamic> metadata, String text) {
    final rawTransactions = metadata['transactions'] ?? metadata['result'];
    if (rawTransactions is! List || rawTransactions.isEmpty) {
      return const SizedBox.shrink();
    }

    final transactions = rawTransactions
        .whereType<Map<String, dynamic>>()
        .map(Transaction.fromJson)
        .toList();
    if (transactions.isEmpty) return const SizedBox.shrink();

    return AiSearchResultCard(
      transactions: transactions,
      metadata: metadata,
      query: text,
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
        return const SizedBox.shrink();
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
    final inputStyle = TextStyle(fontSize: 14, height: 1.4, color: inputFg);

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

/*
// Legacy chat read-result UI. Preserved for rollback/reference after replacing
// it with shared/widgets/ai_search_result_card.dart.
class _ChatReadResultPreview extends StatefulWidget {
  final List<Transaction> transactions;
  final Map<String, dynamic> metadata;

  const _ChatReadResultPreview({
    required this.transactions,
    required this.metadata,
  });

  @override
  State<_ChatReadResultPreview> createState() => _ChatReadResultPreviewState();
}

class _ChatReadResultPreviewState extends State<_ChatReadResultPreview> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currency = NumberFormat('#,###', 'ko_KR');
    final transactions = widget.transactions;
    final visibleTransactions = _expanded
        ? transactions
        : transactions.take(5).toList();
    final total = transactions.fold<num>(0, (sum, tx) => sum + tx.amount);
    final average = transactions.isEmpty ? 0 : total / transactions.length;
    final action = widget.metadata['action'];
    final category = action is Map<String, dynamic>
        ? action['category'] as String?
        : null;
    final month = action is Map<String, dynamic>
        ? action['month'] as String?
        : null;
    final label = [
      if (month != null) month,
      if (category != null) category,
      '거래 조회',
    ].join(' · ');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.52),
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.35),
          width: 0.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: theme.textTheme.labelSmall),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: [
              _ChatReadMetric(
                label: '총액',
                value: '${currency.format(total.round())}원',
                emphasized: true,
              ),
              _ChatReadMetric(label: '건수', value: '${transactions.length}건'),
              _ChatReadMetric(
                label: '평균',
                value: '${currency.format(average.round())}원',
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          for (final tx in visibleTransactions)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: _ChatTransactionPreview(transaction: tx),
            ),
          if (transactions.length > 5)
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () => setState(() => _expanded = !_expanded),
                icon: Icon(
                  _expanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  size: 18,
                ),
                label: Text(_expanded ? '접기' : '전체 ${transactions.length}건 보기'),
              ),
            ),
        ],
      ),
    );
  }
}

class _ChatReadMetric extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasized;

  const _ChatReadMetric({
    required this.label,
    required this.value,
    this.emphasized = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      constraints: const BoxConstraints(minWidth: 88),
      padding: const EdgeInsets.all(AppSpacing.xs),
      decoration: BoxDecoration(
        color: emphasized
            ? theme.colorScheme.primary.withValues(alpha: 0.10)
            : theme.colorScheme.surface.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(AppRadii.sm),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: theme.textTheme.labelSmall),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              color: emphasized ? theme.colorScheme.primary : null,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatTransactionPreview extends StatelessWidget {
  final Transaction transaction;

  const _ChatTransactionPreview({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isExpense = transaction.type == 'expense';
    final color = isExpense ? AppColors.expense : AppColors.income;
    final amount = NumberFormat('#,###', 'ko_KR').format(transaction.amount);
    final date = DateTime.tryParse(transaction.date);
    final dateLabel = date == null
        ? transaction.date
        : DateFormat('M.d', 'ko_KR').format(date);
    final title = transaction.memo?.isNotEmpty == true
        ? transaction.memo!
        : transaction.category ?? '미분류';
    final subtitle = [
      dateLabel,
      transaction.category ?? '미분류',
      transaction.type == 'expense' ? '지출' : '수입',
    ].join(' · ');

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.35),
          width: 0.5,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isExpense
                ? Icons.arrow_downward_rounded
                : Icons.arrow_upward_rounded,
            color: color,
            size: 16,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Text(
            '${isExpense ? '-' : '+'}$amount원',
            style: theme.textTheme.labelSmall?.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
*/
