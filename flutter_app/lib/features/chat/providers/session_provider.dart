import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/api/api_client.dart';
import 'package:flutter_app/core/storage/native_shared_prefs.dart';

// ============================================================
// [세션 Provider] session_provider.dart
// 채팅 세션(대화방)의 CRUD를 담당합니다.
//
// SessionItem            — 세션 데이터 모델 (id, title, createdAt, updatedAt)
// sessionProvider         — 전체 세션 목록 조회 (최근 수정순 정렬)
// activeSessionIdProvider — 현재 선택된 세션 ID (StateProvider)
//   → 변경 시 SharedPreferences에도 저장 (Android 네이티브 빠른입력에서 사용)
// createSessionProvider   — 새 세션 생성
// renameSessionProvider   — 세션 이름 변경
// deleteSessionProvider   — 세션 삭제 (삭제된 세션이 활성이면 null로 초기화)
// ============================================================

// 세션 데이터 모델
class SessionItem {
  final int id;
  final String title;
  final DateTime createdAt;
  final DateTime updatedAt;

  SessionItem({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SessionItem.fromJson(Map<String, dynamic> json) {
    return SessionItem(
      id: json['id'] as int,
      title: json['title'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

/// Fetch all sessions for current user
final sessionProvider = FutureProvider.autoDispose<List<SessionItem>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);

  try {
    final data = await apiClient.getSessions();
    final sessions = (data['sessions'] as List)
        .map((s) => SessionItem.fromJson(s as Map<String, dynamic>))
        .toList();

    // Sort by most recent first
    sessions.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));

    // Auto-select first session if none is currently selected
    final activeId = ref.read(activeSessionIdProvider);
    if (activeId == null && sessions.isNotEmpty) {
      // Use addPostFrameCallback to update state after build
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(activeSessionIdProvider.notifier).state = sessions[0].id;
      });
    }

    return sessions;
  } catch (e) {
    throw Exception('Error loading sessions: $e');
  }
});

/// Currently active session ID - persists across navigation
/// Does NOT reset when widget rebuilds.
///
/// Any change is also mirrored to SharedPreferences (`fastsaas.session_id`)
/// so Android native code can read it from a BroadcastReceiver or headless
/// FlutterEngine when the main app process is dead. See NativeSharedPrefs.
final activeSessionIdProvider = StateProvider<int?>((ref) {
  ref.listenSelf((previous, next) {
    NativeSharedPrefs.setSessionId(next);
  });
  return null;
});

/// Create a new session with given title
final createSessionProvider = FutureProvider.family<int, String>((ref, title) async {
  final apiClient = ref.watch(apiClientProvider);

  try {
    final sessionId = await apiClient.createSession(title);

    // Refresh sessions list
    ref.invalidate(sessionProvider);

    return sessionId;
  } catch (e) {
    throw Exception('Error creating session: $e');
  }
});

/// Rename an existing session
final renameSessionProvider =
    FutureProvider.family<void, (int, String)>((ref, args) async {
  final apiClient = ref.watch(apiClientProvider);
  final (sessionId, newTitle) = args;

  try {
    await apiClient.renameSession(sessionId, newTitle);

    // Refresh sessions list
    ref.invalidate(sessionProvider);
  } catch (e) {
    throw Exception('Error renaming session: $e');
  }
});

/// Delete a session (hard delete, permanent)
final deleteSessionProvider =
    FutureProvider.family<void, int>((ref, sessionId) async {
  final apiClient = ref.watch(apiClientProvider);

  try {
    await apiClient.deleteSession(sessionId);

    // Refresh sessions list
    ref.invalidate(sessionProvider);

    // Clear active session if deleted one was active
    final activeId = ref.read(activeSessionIdProvider);
    if (activeId == sessionId) {
      ref.read(activeSessionIdProvider.notifier).state = null;
    }
  } catch (e) {
    throw Exception('Error deleting session: $e');
  }
});
