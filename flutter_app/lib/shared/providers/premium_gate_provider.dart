import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/shared/models/billing_plan.dart';

final isPremiumUserProvider = Provider<bool>((ref) {
  final plan = ref.watch(currentBillingPlanProvider);
  return plan.plan == PlanStatus.paid;
});

final premiumGuardProvider = Provider<PremiumGuard>((ref) {
  final plan = ref.watch(currentBillingPlanProvider);
  return PremiumGuard(plan: plan);
});

class PremiumGuard {
  final BillingPlan plan;

  const PremiumGuard({required this.plan});

  bool get isPremium => plan.plan == PlanStatus.paid;

  bool get canRemoveAds => isPremium;

  String? get premiumStatusLabel {
    if (isPremium) {
      return '프리미엄 이용 중';
    }
    return null;
  }
}
