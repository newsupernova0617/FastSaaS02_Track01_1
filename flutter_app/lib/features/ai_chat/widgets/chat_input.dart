import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

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
  final stt.SpeechToText _speech = stt.SpeechToText();
  int _charCount = 0;
  bool _focused = false;
  bool _speechAvailable = false;
  bool _listening = false;

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
    _speech.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.isLoading) return;
    HapticFeedback.lightImpact();
    if (_listening) {
      _speech.stop();
      setState(() => _listening = false);
    }
    widget.onSend(text);
    _controller.clear();
    _charCount = 0;
  }

  Future<void> _toggleVoiceInput() async {
    if (widget.isLoading) return;

    if (_listening) {
      await _speech.stop();
      if (!mounted) return;
      setState(() => _listening = false);
      return;
    }

    HapticFeedback.selectionClick();
    _speechAvailable = await _speech.initialize(
      onStatus: (status) {
        if (!mounted) return;
        final isActive = status == 'listening';
        if (_listening != isActive) {
          setState(() => _listening = isActive);
        }
      },
      onError: (_) {
        if (!mounted) return;
        setState(() => _listening = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('음성 인식을 시작하지 못했습니다.')));
      },
    );

    if (!_speechAvailable) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('이 기기에서 음성 인식을 사용할 수 없습니다.')),
      );
      return;
    }

    await _speech.listen(
      localeId: 'ko_KR',
      listenOptions: stt.SpeechListenOptions(
        partialResults: true,
        cancelOnError: true,
        listenMode: stt.ListenMode.dictation,
      ),
      onResult: (result) {
        if (!mounted) return;
        final recognized = result.recognizedWords.trim();
        final text = recognized.length > widget.maxLength
            ? recognized.substring(0, widget.maxLength)
            : recognized;

        _controller.value = TextEditingValue(
          text: text,
          selection: TextSelection.collapsed(offset: text.length),
        );

        if (result.finalResult) {
          setState(() => _listening = false);
        }
      },
    );

    if (!mounted) return;
    setState(() => _listening = true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Option A: 테마 따름
    final pillBg = isDark
        ? theme.colorScheme.surfaceContainerHighest
        : Colors.white;
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
                padding: const EdgeInsets.only(right: AppSpacing.md, bottom: 6),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '$_charCount/${widget.maxLength}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: overLimit ? theme.colorScheme.error : hintColor,
                      fontWeight: overLimit ? FontWeight.w700 : FontWeight.w500,
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
                          color: Colors.black.withValues(
                            alpha: isDark ? 0.30 : 0.06,
                          ),
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
                  _buildVoiceButton(),
                  const SizedBox(width: 6),
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
                : Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.08),
            boxShadow: canSend ? AppGlow.small() : null,
          ),
          child: Icon(
            Icons.arrow_upward_rounded,
            size: 20,
            color: canSend
                ? Colors.white
                : Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.35),
          ),
        ),
      ),
    );
  }

  Widget _buildVoiceButton() {
    final theme = Theme.of(context);
    final isActive = _listening;
    final canUse = !widget.isLoading;
    final backgroundColor = isActive
        ? AppColors.primary.withValues(alpha: 0.16)
        : theme.colorScheme.onSurface.withValues(alpha: 0.08);
    final iconColor = isActive
        ? AppColors.primary
        : theme.colorScheme.onSurface.withValues(alpha: canUse ? 0.55 : 0.25);

    return Tooltip(
      message: isActive ? '음성 입력 중지' : '음성 입력',
      child: Semantics(
        button: true,
        label: isActive ? '음성 입력 중지' : '음성 입력',
        child: GestureDetector(
          onTap: canUse ? _toggleVoiceInput : null,
          child: AnimatedContainer(
            duration: AppMotion.fast,
            curve: AppMotion.emphasized,
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: backgroundColor,
              border: isActive
                  ? Border.all(color: AppColors.primary.withValues(alpha: 0.45))
                  : null,
            ),
            child: Icon(
              isActive ? Icons.mic_rounded : Icons.mic_none_rounded,
              size: 20,
              color: iconColor,
            ),
          ),
        ),
      ),
    );
  }
}
