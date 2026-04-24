import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/api/api_client.dart';
import 'package:flutter_app/features/chat/providers/session_provider.dart';
import 'package:flutter_app/shared/models/ai_action.dart';
import 'package:flutter_app/shared/providers/chat_provider.dart';

final aiActionControllerProvider = Provider<AiActionController>((ref) {
  return AiActionController(ref);
});

class AiActionController {
  final Ref _ref;

  AiActionController(this._ref);

  Future<int> ensureSession() async {
    final active = _ref.read(activeSessionIdProvider);
    if (active != null) return active;

    final sessions = await _ref.read(sessionProvider.future);
    if (sessions.isNotEmpty) {
      final id = sessions.first.id;
      _ref.read(activeSessionIdProvider.notifier).state = id;
      return id;
    }

    final id = await _ref.read(createSessionProvider('AI 기능').future);
    _ref.read(activeSessionIdProvider.notifier).state = id;
    return id;
  }

  Future<AiActionResponse> run(String text) async {
    final sessionId = await ensureSession();
    final response = await _ref
        .read(apiClientProvider)
        .runAiAction(text: text, sessionId: sessionId);
    _ref.invalidate(chatMessagesProvider(sessionId));
    _ref.invalidate(sessionProvider);
    return response;
  }
}
