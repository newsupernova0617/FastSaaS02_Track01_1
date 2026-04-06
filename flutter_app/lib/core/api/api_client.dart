import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/constants/app_constants.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/models/chat_message.dart';
import 'package:flutter_app/shared/models/summary_row.dart';
import 'package:flutter_app/shared/models/ai_action_response.dart';
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
      final response = await _dio.post(
        '/ai/action',
        data: {'text': text},
      );

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
        final messages = (responseData['messages'] as List<dynamic>?)
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

  /// Format DateTime to YYYY-MM-DD
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}

/// Provider for Dio instance
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
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
