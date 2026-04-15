import 'package:dio/dio.dart';
import 'package:flutter/services.dart';

/// MethodChannel names shared with Kotlin side (see QuickEntryReceiver.kt).
/// Inbound: Kotlin → Dart (onQuickEntrySubmit). This is the existing
/// foreground_service channel also used by ForegroundServiceManager.
/// Result: Dart → Kotlin (notifyQuickEntryResult). Dedicated channel so
/// installing a handler here does not clobber the main-app handler.
const String _kInboundChannelName = 'com.fastsaas02.app/foreground_service';
const String _kResultChannelName = 'com.fastsaas02.app/quick_entry_result';

const MethodChannel _inboundChannel = MethodChannel(_kInboundChannelName);
const MethodChannel _resultChannel = MethodChannel(_kResultChannelName);

/// Install the quick-entry handler onto the shared foreground_service channel.
///
/// Safe to call multiple times: re-assigning the handler just replaces it.
/// Must be called from a context where [WidgetsFlutterBinding.ensureInitialized]
/// has already run (true for both the main app and the headless entrypoint).
void installQuickEntryHandler() {
  _inboundChannel.setMethodCallHandler(_dispatch);
}

Future<dynamic> _dispatch(MethodCall call) async {
  if (call.method != 'onQuickEntrySubmit') {
    // Not ours — return null so other handlers on the same channel aren't
    // blocked. (Currently no other handler sets a callback here, but leave
    // the guard in place for safety.)
    return null;
  }

  final args = Map<String, dynamic>.from(call.arguments as Map);
  final text = args['text'] as String? ?? '';
  final jwt = args['jwt'] as String? ?? '';
  final sessionIdRaw = args['sessionId'];
  final int sessionId = sessionIdRaw is int
      ? sessionIdRaw
      : (sessionIdRaw as num?)?.toInt() ?? -1;
  final apiBaseUrl = args['apiBaseUrl'] as String? ?? '';

  if (text.isEmpty || jwt.isEmpty || sessionId <= 0 || apiBaseUrl.isEmpty) {
    await _reportResult(success: false, body: '잘못된 요청');
    return null;
  }

  try {
    final body = await _processQuickEntry(
      text: text,
      jwt: jwt,
      sessionId: sessionId,
      apiBaseUrl: apiBaseUrl,
    );
    await _reportResult(success: true, body: body);
  } catch (e) {
    await _reportResult(success: false, body: _shortError(e));
  }
  return null;
}

/// Core pipeline: POST the user text, then fetch the latest assistant reply
/// to produce a short, human-readable notification body.
Future<String> _processQuickEntry({
  required String text,
  required String jwt,
  required int sessionId,
  required String apiBaseUrl,
}) async {
  final dio = Dio(
    BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
      headers: {
        'Authorization': 'Bearer $jwt',
      },
    ),
  );

  // Send the message — mirrors ApiClient.sendSessionMessage.
  final sendResp = await dio.post(
    '/sessions/$sessionId/messages',
    data: {'content': text},
  );
  if (sendResp.statusCode != 200 && sendResp.statusCode != 201) {
    throw Exception('HTTP ${sendResp.statusCode}');
  }

  // Some backends return {messages: [userMsg, aiMsg]} directly on POST. If
  // so, use that; otherwise fall back to fetching the session history.
  String? assistantContent;
  final sendData = sendResp.data;
  if (sendData is Map && sendData['messages'] is List) {
    final list = sendData['messages'] as List;
    final ai = list.lastWhere(
      (m) => (m as Map)['role'] == 'assistant',
      orElse: () => null,
    );
    if (ai != null) {
      assistantContent = (ai as Map)['content'] as String?;
    }
  }

  if (assistantContent == null) {
    final historyResp = await dio.get('/sessions/$sessionId/messages');
    final historyData = historyResp.data as Map<String, dynamic>;
    final msgs = (historyData['messages'] as List).cast<Map<String, dynamic>>();
    final assistantMsgs = msgs.where((m) => m['role'] == 'assistant').toList();
    if (assistantMsgs.isNotEmpty) {
      assistantContent = assistantMsgs.last['content'] as String?;
    }
  }

  final body = (assistantContent ?? '처리됨').trim();
  return body.length > 120 ? '${body.substring(0, 120)}…' : body;
}

Future<void> _reportResult({
  required bool success,
  required String body,
}) async {
  try {
    await _resultChannel.invokeMethod('notifyQuickEntryResult', {
      'success': success,
      'body': body,
    });
  } catch (_) {
    // Best-effort — if the channel is already torn down, nothing to do.
  }
}

String _shortError(Object e) {
  if (e is DioException) {
    final status = e.response?.statusCode;
    if (status != null) return '서버 오류 ($status)';
    return '네트워크 오류';
  }
  final s = e.toString();
  return s.length > 80 ? '${s.substring(0, 80)}…' : s;
}
