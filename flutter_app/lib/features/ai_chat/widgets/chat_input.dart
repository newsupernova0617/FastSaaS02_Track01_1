import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/widgets/ai_loading_status.dart';

class ChatInput extends StatefulWidget {
  final Function(String) onSend;
  final bool isLoading;
  final int maxLength;
  final String? pendingPrompt;

  const ChatInput({
    super.key,
    required this.onSend,
    this.isLoading = false,
    this.maxLength = 500,
    this.pendingPrompt,
  });

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;
  int _charCount = 0;
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController()
      ..addListener(() {
        if (!mounted) return;
        setState(() => _charCount = _controller.text.length);
      });
    _focusNode = FocusNode()
      ..addListener(() {
        if (!mounted) return;
        setState(() => _focused = _focusNode.hasFocus);
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.isLoading || _charCount > widget.maxLength)
      return;
    HapticFeedback.lightImpact();
    widget.onSend(text);
    _controller.clear();
    setState(() => _charCount = 0);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hintColor = theme.colorScheme.onSurface.withValues(alpha: 0.42);
    final overLimit = _charCount > widget.maxLength;
    final canSend =
        _controller.text.trim().isNotEmpty && !widget.isLoading && !overLimit;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.sm,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.isLoading) ...[
              AiLoadingStatus(prompt: widget.pendingPrompt, dense: true),
              const SizedBox(height: AppSpacing.sm),
            ],
            if (_charCount > widget.maxLength * 0.8)
              Padding(
                padding: const EdgeInsets.only(right: AppSpacing.md, bottom: 6),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '$_charCount/${widget.maxLength}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: overLimit ? theme.colorScheme.error : hintColor,
                    ),
                  ),
                ),
              ),
            AnimatedContainer(
              duration: AppMotion.fast,
              curve: AppMotion.emphasized,
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(AppRadii.pill),
                border: Border.all(
                  color: _focused
                      ? theme.colorScheme.primary.withValues(alpha: 0.55)
                      : theme.colorScheme.outline,
                  width: _focused ? 1.2 : 0.8,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.07),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              padding: const EdgeInsets.only(
                left: AppSpacing.lg,
                right: 6,
                top: 6,
                bottom: 6,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      enabled: !widget.isLoading,
                      maxLines: 4,
                      minLines: 1,
                      maxLength: widget.maxLength,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _handleSend(),
                      style: theme.textTheme.bodyLarge?.copyWith(height: 1.35),
                      cursorColor: theme.colorScheme.primary,
                      decoration: InputDecoration(
                        isCollapsed: true,
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.md + 2,
                        ),
                        hintText: '오늘 지출을 말하듯 입력해보세요',
                        hintStyle: TextStyle(color: hintColor),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        disabledBorder: InputBorder.none,
                        errorBorder: InputBorder.none,
                        filled: false,
                        counterText: '',
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _SendButton(
                    canSend: canSend,
                    isLoading: widget.isLoading,
                    onTap: _handleSend,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SendButton extends StatelessWidget {
  final bool canSend;
  final bool isLoading;
  final VoidCallback onTap;

  const _SendButton({
    required this.canSend,
    required this.isLoading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    if (isLoading) {
      return SizedBox(
        width: 40,
        height: 40,
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(primary),
            ),
          ),
        ),
      );
    }

    return Semantics(
      button: true,
      label: '메시지 보내기',
      child: GestureDetector(
        onTap: canSend ? onTap : null,
        child: AnimatedContainer(
          duration: AppMotion.fast,
          curve: AppMotion.emphasized,
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: canSend
                ? primary
                : theme.colorScheme.onSurface.withValues(alpha: 0.08),
            boxShadow: canSend ? AppGlow.small(color: primary) : null,
          ),
          child: Icon(
            Icons.arrow_upward_rounded,
            size: 20,
            color: canSend
                ? Colors.white
                : theme.colorScheme.onSurface.withValues(alpha: 0.35),
          ),
        ),
      ),
    );
  }
}
