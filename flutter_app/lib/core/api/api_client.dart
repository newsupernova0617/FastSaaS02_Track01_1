import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/constants/app_constants.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/models/chat_message.dart';
import 'package:flutter_app/shared/models/summary_row.dart';
import 'package:flutter_app/shared/models/report.dart';
import 'package:flutter_app/shared/models/report_type.dart';
import 'package:flutter_app/shared/providers/api_provider.dart';

// ============================================================
// [API 클라이언트] api_client.dart
// 백엔드 서버(Cloudflare Workers)와의 모든 HTTP 통신을 담당합니다.
// Dio 라이브러리를 사용하며, 인증 토큰은 AuthInterceptor가 자동 첨부합니다.
//
// 주요 메서드:
//   거래: getTransactions(), addTransaction(), deleteTransaction()
//   요약: getSummary() — 월별 카테고리별 합계
//   채팅: getSessions(), createSession(), getSessionMessages(),
//         sendSessionMessage() — 세션 기반 채팅
//   리포트: getReports(), getReportDetail(), saveReport(),
//           deleteReport(), updateReport()
// ============================================================
class ApiClient {
  late final Dio _dio;

  ApiClient({required Dio dio}) : _dio = dio;

  /// Get transactions for a specific date or all transactions
  /// GET /api/transactions?date=YYYY-MM-DD (optional)
  Future<List<Transaction>> getTransactions({DateTime? date}) async {
    try {
      final params = <String, dynamic>{};
      if (date != null) {
        params['date'] = _formatDate(date);
      }

      final response = await _dio.get(
        '${AppConstants.transactionsEndpoint}',
        queryParameters: params.isNotEmpty ? params : null,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data as List<dynamic>;
        return data
            .map((e) => Transaction.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Add a new transaction
  /// POST /api/transactions
  /// Returns the ID of the created transaction
  Future<int> addTransaction(Map<String, dynamic> data) async {
    try {
      // Transform 'type' to 'transactionType' for backend compatibility
      final requestData = {...data};
      if (requestData.containsKey('type')) {
        requestData['transactionType'] = requestData.remove('type');
      }

      final response = await _dio.post(
        '${AppConstants.transactionsEndpoint}',
        data: requestData,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        return responseData['id'] as int;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Delete a transaction
  /// DELETE /api/transactions/:id
  /// Returns true if deletion was successful
  Future<bool> deleteTransaction(String id) async {
    try {
      final response = await _dio.delete(
        '${AppConstants.transactionsEndpoint}/$id',
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        final success = responseData['success'];
        if (success == null) throw Exception('응답 형식 오류: success 필드 없음');
        return success as bool;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Get transaction summary for a specific month
  /// GET /api/transactions/summary?month=YYYY-MM
  Future<List<SummaryRow>> getSummary(String month) async {
    try {
      final response = await _dio.get(
        '${AppConstants.transactionsEndpoint}/summary',
        queryParameters: {'month': month},
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data as List<dynamic>;
        return data
            .map((e) => SummaryRow.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Save a new report to the backend
  /// POST /api/reports
  /// Returns the ID of the created report
  Future<int> saveReport({
    required ReportType reportType,
    required String title,
    String? subtitle,
    required List<Map<String, dynamic>> reportData,
    required Map<String, dynamic> params,
  }) async {
    try {
      final response = await _dio.post(
        '/reports',
        data: {
          'reportType': reportType.name,
          'title': title,
          'subtitle': subtitle,
          'reportData': reportData,
          'params': params,
        },
      );

      if (response.statusCode == 201) {
        return response.data['id'] as int;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Get list of saved reports with optional month filter
  /// GET /api/reports?limit=50&month=YYYY-MM (optional)
  Future<List<ReportSummary>> getReports({
    String? month,
    int limit = 50,
  }) async {
    try {
      final params = <String, dynamic>{
        'limit': limit,
      };
      if (month != null) {
        params['month'] = month;
      }

      final response = await _dio.get(
        '/reports',
        queryParameters: params,
      );

      if (response.statusCode == 200) {
        final reports = (response.data['reports'] as List)
            .map((json) => ReportSummary.fromJson(json as Map<String, dynamic>))
            .toList();
        return reports;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Get full details of a specific report
  /// GET /api/reports/:id
  Future<ReportDetail> getReportDetail(int reportId) async {
    try {
      final response = await _dio.get('/reports/$reportId');

      if (response.statusCode == 200) {
        final reportJson = response.data['report'] as Map<String, dynamic>;
        return ReportDetail.fromJson(reportJson);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Delete a report by ID
  /// DELETE /api/reports/:id
  Future<void> deleteReport(int reportId) async {
    try {
      final response = await _dio.delete('/reports/$reportId');

      if (response.statusCode != 200) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
        );
      }
    } on DioException {
      rethrow;
    }
  }

  /// Update a report title
  /// PATCH /api/reports/:id
  Future<void> updateReport(int reportId, String newTitle) async {
    try {
      final response = await _dio.patch(
        '/reports/$reportId',
        data: {'title': newTitle},
      );

      if (response.statusCode != 200) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
        );
      }
    } on DioException {
      rethrow;
    }
  }

  /// Get sessions for the current user
  /// GET /api/sessions?limit=50
  Future<Map<String, dynamic>> getSessions({int limit = 50}) async {
    try {
      final response = await _dio.get('/sessions',
          queryParameters: {'limit': limit});

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Create a new session
  /// POST /api/sessions
  /// Returns the ID of the created session
  Future<int> createSession(String title) async {
    try {
      final response = await _dio.post(
        '/sessions',
        data: {'title': title},
      );

      if (response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        final sessionData = responseData['session'] as Map<String, dynamic>;
        return sessionData['id'] as int;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Rename an existing session
  /// PATCH /api/sessions/:id
  Future<void> renameSession(int sessionId, String newTitle) async {
    try {
      final response = await _dio.patch(
        '/sessions/$sessionId',
        data: {'title': newTitle},
      );

      if (response.statusCode != 200) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
        );
      }
    } on DioException {
      rethrow;
    }
  }

  /// Delete a session
  /// DELETE /api/sessions/:id
  Future<void> deleteSession(int sessionId) async {
    try {
      final response = await _dio.delete('/sessions/$sessionId');

      if (response.statusCode != 200) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
        );
      }
    } on DioException {
      rethrow;
    }
  }

  /// Get chat messages for a session
  /// GET /api/sessions/:sessionId/messages
  Future<List<ChatMessage>> getSessionMessages(int sessionId) async {
    try {
      final response = await _dio.get('/sessions/$sessionId/messages');

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final messages = (data['messages'] as List)
            .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
            .toList();
        return messages;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Send a chat message in a session
  /// POST /api/sessions/:sessionId/messages
  /// Returns void - messages are fetched via getSessionMessages
  Future<void> sendSessionMessage(
    int sessionId,
    String message,
  ) async {
    try {
      final response = await _dio.post(
        '/sessions/$sessionId/messages',
        data: {'content': message},
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
        );
      }
    } on DioException {
      rethrow;
    }
  }

  /// Format DateTime to YYYY-MM-DD
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}

/// Provider for API Client
final apiClientProvider = Provider<ApiClient>((ref) {
  // Use the authenticated Dio from api_provider instead of creating a new one
  // This ensures all API requests include JWT tokens and handle 401 errors
  final dio = ref.watch(authenticatedDioProvider);
  return ApiClient(dio: dio);
});
