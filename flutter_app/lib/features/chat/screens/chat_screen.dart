import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/features/chat/widgets/session_sidebar.dart';
import 'package:flutter_app/features/chat/providers/session_provider.dart';
import 'package:flutter_app/shared/providers/chat_provider.dart';
import 'package:flutter_app/shared/models/chat_message.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void dispose() {
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

  Future<void> _sendMessage(String text) async {
    final activeSessionId = ref.read(activeSessionIdProvider);

    if (activeSessionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or create a session first')),
      );
      return;
    }

    setState(() => _isSending = true);

    try {
      await ref.read(
        sendChatMessageProvider((text, activeSessionId)).future,
      );
      _messageController.clear();

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

    return Scaffold(
      body: Row(
        children: [
          // Left sidebar with sessions
          sessionsAsync.when(
            data: (sessions) => SessionSidebar(
              activeSessionId: activeSessionId,
              onSessionSelect: (sessionId) {
                ref.read(activeSessionIdProvider.notifier).state = sessionId;
              },
              onNewSession: _createNewSession,
              sessions: sessions,
              isLoading: false,
            ),
            loading: () => SessionSidebar(
              activeSessionId: null,
              onSessionSelect: (_) {},
              onNewSession: () {},
              sessions: const [],
              isLoading: true,
            ),
            error: (err, stack) => SessionSidebar(
              activeSessionId: null,
              onSessionSelect: (_) {},
              onNewSession: _createNewSession,
              sessions: [],
              isLoading: false,
            ),
          ),

          // Chat area
          Expanded(
            child: activeSessionId == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('No conversation selected'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _createNewSession,
                          child: const Text('Start New Conversation'),
                        ),
                      ],
                    ),
                  )
                : Column(
                    children: [
                      // Chat messages
                      Expanded(
                        child: Consumer(
                          builder: (context, ref, child) {
                            final messagesAsync =
                                ref.watch(chatMessagesProvider(activeSessionId));

                            return messagesAsync.when(
                              data: (messages) => ListView.builder(
                                controller: _scrollController,
                                itemCount: messages.length,
                                itemBuilder: (context, index) {
                                  final msg = messages[index];
                                  return _buildChatBubble(msg);
                                },
                              ),
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
                                ),
                                maxLines: null,
                                enabled: !_isSending,
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: _isSending
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
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble(ChatMessage msg) {
    final isUser = msg.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isUser ? AppTheme.primaryColor : Colors.grey[200],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          msg.content,
          style: TextStyle(
            color: isUser ? Colors.white : Colors.black,
          ),
        ),
      ),
    );
  }
}
