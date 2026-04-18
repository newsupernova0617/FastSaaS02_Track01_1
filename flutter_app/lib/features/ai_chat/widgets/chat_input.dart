import 'package:flutter/material.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [채팅 위젯] chat_input.dart
// AI 채팅 화면 하단의 메시지 입력 영역입니다.
// 텍스트 입력 필드 + 전송 버튼(원형)으로 구성됩니다.
// 글자 수 제한(기본 500자)이 있고, 80% 초과 시 카운터 표시됩니다.
// 로딩 중에는 전송 버튼이 스피너로 변경됩니다.
// ============================================================
class ChatInput extends StatefulWidget {
  final Function(String) onSend;
  final bool isLoading;
  final int maxLength;

  const ChatInput({
    super.key,
    required this.onSend,
    this.isLoading = false,
    this.maxLength = 500,
  });

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  late TextEditingController _controller;
  int _charCount = 0;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _controller.addListener(() {
      setState(() {
        _charCount = _controller.text.length;
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isNotEmpty && !widget.isLoading) {
      widget.onSend(text);
      _controller.clear();
      _charCount = 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEmpty = _controller.text.trim().isEmpty;
    final overLimit = _charCount > widget.maxLength;
    final muted = theme.colorScheme.onSurface.withValues(alpha: 0.55);
    final outline = theme.colorScheme.outline.withValues(alpha: 0.25);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: outline, width: 1),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Character counter (80% 이상일 때만)
            if (_charCount > widget.maxLength * 0.8)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      '$_charCount/${widget.maxLength}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: overLimit ? theme.colorScheme.error : muted,
                        fontWeight:
                            overLimit ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
            // Input + send button
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    enabled: !widget.isLoading,
                    maxLines: null,
                    maxLength: widget.maxLength,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _handleSend(),
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurface,
                    ),
                    cursorColor: theme.colorScheme.primary,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: theme.colorScheme.surfaceContainerHighest,
                      hintText: 'AI에게 메시지 입력...',
                      hintStyle: TextStyle(color: muted),
                      isDense: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadii.lg),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadii.lg),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadii.lg),
                        borderSide: BorderSide(
                          color: theme.colorScheme.primary
                              .withValues(alpha: 0.45),
                          width: 1.2,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                        vertical: AppSpacing.md,
                      ),
                      counterText: '',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                _buildSendButton(theme, isEmpty),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSendButton(ThemeData theme, bool isEmpty) {
    if (widget.isLoading) {
      return SizedBox(
        width: 44,
        height: 44,
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor:
                  AlwaysStoppedAnimation<Color>(theme.colorScheme.primary),
            ),
          ),
        ),
      );
    }

    final disabled = isEmpty;
    final bg = disabled
        ? theme.colorScheme.surfaceContainerHighest
        : theme.colorScheme.primary;
    final fg = disabled
        ? theme.colorScheme.onSurface.withValues(alpha: 0.35)
        : Colors.white;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: disabled ? null : _handleSend,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: bg,
            shape: BoxShape.circle,
            boxShadow: disabled
                ? null
                : [
                    BoxShadow(
                      color: theme.colorScheme.primary.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Icon(Icons.arrow_upward_rounded, color: fg, size: 20),
        ),
      ),
    );
  }
}
