import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] chat_input.dart
// Glass pill 통합 입력 — 테마 연동 (Option A).
//   라이트: 흰 pill + 검정 텍스트
//   다크:   surfaceContainerHighest (#1A1A24) pill + 흰 텍스트
// Focus 시 violet 보더 + glow.
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
  late final TextEditingController _controller;
  late final FocusNode _focusNode;
  int _charCount = 0;
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _controller.addListener(() {
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
    if (text.isEmpty || widget.isLoading) return;
    HapticFeedback.lightImpact();
    widget.onSend(text);
    _controller.clear();
    _charCount = 0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Option A: 테마 따름
    final pillBg = isDark ? theme.colorScheme.surfaceContainerHighest : Colors.white;
    final pillFg = isDark ? theme.colorScheme.onSurface : Colors.black;
    final hintColor = isDark
        ? theme.colorScheme.onSurface.withValues(alpha: 0.5)
        : const Color(0xFF6B7280);
    final idleBorderColor = isDark
        ? theme.colorScheme.outline.withValues(alpha: 0.5)
        : const Color(0xFFE5E7EB);

    final isEmpty = _controller.text.trim().isEmpty;
    final overLimit = _charCount > widget.maxLength;
    final canSend = !isEmpty && !widget.isLoading;

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
            // 글자 수 카운터 (80% 이상)
            if (_charCount > widget.maxLength * 0.8)
              Padding(
                padding: const EdgeInsets.only(
                  right: AppSpacing.md,
                  bottom: 6,
                ),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '$_charCount/${widget.maxLength}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: overLimit ? theme.colorScheme.error : hintColor,
                      fontWeight:
                          overLimit ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              ),

            // Pill composer — 테마 연동 (Option A)
            AnimatedContainer(
              duration: AppMotion.fast,
              curve: AppMotion.emphasized,
              decoration: BoxDecoration(
                color: pillBg,
                borderRadius: BorderRadius.circular(AppRadii.pill),
                border: Border.all(
                  color: _focused
                      ? AppColors.primary.withValues(alpha: 0.55)
                      : idleBorderColor,
                  width: _focused ? 1.4 : 0.8,
                ),
                boxShadow: _focused
                    ? AppGlow.small()
                    : [
                        BoxShadow(
                          color: Colors.black
                              .withValues(alpha: isDark ? 0.30 : 0.06),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
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
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: pillFg,
                        height: 1.35,
                      ),
                      cursorColor: AppColors.primary,
                      cursorWidth: 1.6,
                      decoration: InputDecoration(
                        isCollapsed: true,
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.md + 2,
                        ),
                        hintText: 'AI에게 메시지 입력…',
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
                  _buildSendButton(canSend: canSend),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSendButton({required bool canSend}) {
    if (widget.isLoading) {
      return const SizedBox(
        width: 40,
        height: 40,
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ),
        ),
      );
    }

    return Semantics(
      button: true,
      label: 'Send message',
      child: GestureDetector(
        onTap: canSend ? _handleSend : null,
        child: AnimatedContainer(
          duration: AppMotion.fast,
          curve: AppMotion.emphasized,
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: canSend ? AppGradients.brand : null,
            color: canSend
                ? null
                : Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.08),
            boxShadow: canSend ? AppGlow.small() : null,
          ),
          child: Icon(
            Icons.arrow_upward_rounded,
            size: 20,
            color: canSend
                ? Colors.white
                : Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.35),
          ),
        ),
      ),
    );
  }
}
