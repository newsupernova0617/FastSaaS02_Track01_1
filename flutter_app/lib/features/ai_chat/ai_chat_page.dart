import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/shared/models/chat_message.dart';
import 'package:flutter_app/shared/providers/ai_chat_provider.dart';
import 'widgets/chat_bubble.dart';
import 'widgets/chat_input.dart';

class AIChatPage extends ConsumerStatefulWidget {
  const AIChatPage({Key? key}) : super(key: key);

  @override
  ConsumerState<AIChatPage> createState() => _AIChatPageState();
}

class _AIChatPageState extends ConsumerState<AIChatPage> {
  late ScrollController _scrollController;
  final List<ChatMessage> _optimisticMessages = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSendMessage(String text) async {
    if (text.isEmpty) return;

    // Create optimistic user message
    final userMessage = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch,
      userId: '', // Will be filled by backend
      role: 'user',
      content: text,
      metadata: null,
      createdAt: DateTime.now().toIso8601String(),
    );

    setState(() {
      _optimisticMessages.add(userMessage);
      _isLoading = true;
    });

    _scrollToBottom();

    try {
      // Send message and get response
      final response = await ref.read(sendAIMessageProvider(text).future);

      setState(() {
        _optimisticMessages.add(response);
        _isLoading = false;
      });

      _scrollToBottom();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });

      // Show error snackbar
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('메시지 전송 실패: ${e.toString()}'),
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: '다시 시도',
              textColor: Colors.white,
              onPressed: () {
                _handleSendMessage(text);
              },
            ),
          ),
        );
      }

      // Remove the user message on error
      setState(() {
        _optimisticMessages.removeWhere((m) => m.id == userMessage.id);
      });
    }
  }

  void _handleClearHistory() async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('대화 기록 삭제'),
        content: const Text('모든 대화 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('삭제', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await ref.read(clearChatHistoryProvider.future);
        setState(() {
          _optimisticMessages.clear();
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('대화 기록이 삭제되었습니다'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('삭제 실패: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatHistoryAsync = ref.watch(getChatHistoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI 채팅'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: _handleClearHistory,
            tooltip: '대화 기록 삭제',
          ),
        ],
      ),
      body: chatHistoryAsync.when(
        data: (chatHistory) => _buildChatView(chatHistory),
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) => _buildErrorView(error),
      ),
    );
  }

  Widget _buildChatView(List<ChatMessage> chatHistory) {
    // Combine loaded history with optimistic messages
    final allMessages = [
      ...chatHistory,
      ..._optimisticMessages.where(
        (msg) => !chatHistory.any((hist) => hist.id == msg.id),
      ),
    ];

    // Sort by created date
    allMessages.sort(
      (a, b) => DateTime.parse(a.createdAt).compareTo(
        DateTime.parse(b.createdAt),
      ),
    );

    return Column(
      children: [
        Expanded(
          child: allMessages.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  controller: _scrollController,
                  itemCount: allMessages.length,
                  itemBuilder: (context, index) {
                    final message = allMessages[index];
                    return ChatBubble(
                      message: message.content,
                      isUser: message.role == 'user',
                      timestamp: DateTime.parse(message.createdAt),
                    );
                  },
                ),
        ),
        ChatInput(
          onSend: _handleSendMessage,
          isLoading: _isLoading,
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'AI와의 대화를 시작해보세요',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '궁금한 점을 물어보거나 도움을 요청하세요',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[500],
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(dynamic error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
          const SizedBox(height: 16),
          Text(
            '오류가 발생했습니다',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            error.toString(),
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              // ignore: unused_result
              ref.refresh(getChatHistoryProvider);
            },
            icon: const Icon(Icons.refresh),
            label: const Text('다시 시도'),
          ),
        ],
      ),
    );
  }
}
