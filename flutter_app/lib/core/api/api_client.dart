import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/constants/app_constants.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/models/chat_message.dart';
import 'package:flutter_app/shared/models/summary_row.dart';
import 'package:flutter_app/shared/models/ai_action_response.dart';
import 'package:flutter_app/shared/models/report.dart';
import 'api_interceptor.dart';

/// API Client for handling all API requests
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
        return responseData['success'] as bool? ?? true;
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

  /// Send a message to AI and get response
  /// POST /api/ai/action
  Future<AIActionResponse> sendAIMessage(String text) async {
    try {
      final response = await _dio.post('/ai/action', data: {'text': text});

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        return AIActionResponse.fromJson(responseData);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Retrieve chat history with optional pagination
  /// GET /api/ai/chat/history?limit=50&before=id
  Future<List<ChatMessage>> getChatHistory({
    int? limit,
    DateTime? before,
  }) async {
    try {
      final params = <String, dynamic>{};
      if (limit != null) {
        params['limit'] = limit;
      }
      if (before != null) {
        // If 'before' is a timestamp, format as ISO string
        params['before'] = before.toIso8601String();
      }

      final response = await _dio.get(
        '${AppConstants.aiChatEndpoint}/history',
        queryParameters: params.isNotEmpty ? params : null,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        final messages =
            (responseData['messages'] as List<dynamic>?)
                ?.map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
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

  /// Clear all chat history for the current user
  /// DELETE /api/ai/chat/history
  Future<int> clearChatHistory() async {
    try {
      final response = await _dio.delete(
        '${AppConstants.aiChatEndpoint}/history',
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        return responseData['deletedCount'] as int? ?? 0;
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
    required String reportType,
    required String title,
    String? subtitle,
    required Map<String, dynamic> reportData,
    required Map<String, dynamic> params,
  }) async {
    try {
      final response = await _dio.post(
        '/reports',
        data: {
          'reportType': reportType,
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

  /// Get all sessions for the current user
  /// GET /api/sessions
  Future<Map<String, dynamic>> getSessions() async {
    try {
      final response = await _dio.get('/sessions');

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
  Future<ChatMessage> sendSessionMessage(
    int sessionId,
    String message,
  ) async {
    try {
      final response = await _dio.post(
        '/sessions/$sessionId/messages',
        data: {'content': message},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final messageData = response.data as Map<String, dynamic>;
        return ChatMessage.fromJson(messageData);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
      );
    } on DioException {
      rethrow;
    }
  }

  /// Format DateTime to YYYY-MM-DD
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}

/// Provider for Dio instance
final dioProvider = Provider<Dio>((ref) {
  final baseUrl = AppConstants.apiBaseUrl;
  print('[DIO] Base URL: $baseUrl');

  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: Duration(seconds: AppConstants.connectTimeoutSeconds),
      receiveTimeout: Duration(seconds: AppConstants.apiTimeoutSeconds),
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
    ),
  );

  // Add logging interceptor
  dio.interceptors.add(LoggingInterceptor());

  return dio;
});

/// Provider for API Client
final apiClientProvider = Provider<ApiClient>((ref) {
  final dio = ref.watch(dioProvider);
  return ApiClient(dio: dio);
});
