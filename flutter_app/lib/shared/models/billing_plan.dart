import 'package:flutter_app/core/ads/plan_provider.dart';

class BillingPlan {
  final PlanStatus plan;
  final String status;
  final String? platform;
  final String? productId;
  final DateTime? expiresAt;

  const BillingPlan({
    required this.plan,
    required this.status,
    this.platform,
    this.productId,
    this.expiresAt,
  });

  factory BillingPlan.free() {
    return const BillingPlan(plan: PlanStatus.free, status: 'unknown');
  }

  factory BillingPlan.paidDevOverride() {
    return BillingPlan(
      plan: PlanStatus.paid,
      status: 'active',
      platform: 'android',
      productId: 'dev-override',
      expiresAt: DateTime.now().add(const Duration(days: 365)),
    );
  }

  factory BillingPlan.fromJson(Map<String, dynamic> json) {
    final planValue = json['plan'] as String? ?? 'free';
    return BillingPlan(
      plan: planValue == 'paid' ? PlanStatus.paid : PlanStatus.free,
      status: json['status'] as String? ?? 'unknown',
      platform: json['platform'] as String?,
      productId: json['productId'] as String?,
      expiresAt: _parseDate(json['expiresAt'] as String?),
    );
  }

  static DateTime? _parseDate(String? value) {
    if (value == null || value.isEmpty) return null;
    return DateTime.tryParse(value);
  }
}
