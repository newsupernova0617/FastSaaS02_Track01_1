import 'package:flutter_app/shared/models/transaction.dart';

class AiActionResponse {
  final bool success;
  final String? type;
  final String? message;
  final Map<String, dynamic>? metadata;
  final dynamic result;

  const AiActionResponse({
    required this.success,
    this.type,
    this.message,
    this.metadata,
    this.result,
  });

  factory AiActionResponse.fromJson(Map<String, dynamic> json) {
    return AiActionResponse(
      success: json['success'] == true,
      type: json['type'] as String?,
      message: (json['message'] ?? json['content']) as String?,
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : null,
      result: json['result'],
    );
  }

  List<Transaction> get transactions {
    if (result is! List) return const [];
    return (result as List)
        .whereType<Map<String, dynamic>>()
        .map(Transaction.fromJson)
        .toList();
  }

  int? get reportId {
    final report = metadata?['report'];
    if (report is Map<String, dynamic>) {
      final id = report['id'];
      if (id is int) return id;
      if (id is num) return id.toInt();
    }
    return null;
  }
}
