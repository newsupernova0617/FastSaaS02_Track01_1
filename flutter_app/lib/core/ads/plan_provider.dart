import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/shared/models/billing_plan.dart';
import 'package:flutter_app/shared/providers/api_provider.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';

/// Current subscription plan status of the user.
enum PlanStatus { free, paid }

const _isPremiumOverride = bool.fromEnvironment('PREMIUM', defaultValue: false);

final billingPlanProvider = FutureProvider<BillingPlan>((ref) async {
  if (_isPremiumOverride) {
    return BillingPlan.paidDevOverride();
  }

  final isAuthenticated = ref.watch(isAuthenticatedProvider);
  if (!isAuthenticated) {
    return BillingPlan.free();
  }

  final apiClient = ref.watch(apiClientProvider);
  try {
    return await apiClient.getBillingPlan();
  } catch (_) {
    return BillingPlan.free();
  }
});

final planProvider = Provider<PlanStatus>((ref) {
  if (_isPremiumOverride) {
    return PlanStatus.paid;
  }

  final plan = ref.watch(billingPlanProvider).valueOrNull;
  return plan?.plan ?? PlanStatus.free;
});

final currentBillingPlanProvider = Provider<BillingPlan>((ref) {
  if (_isPremiumOverride) {
    return BillingPlan.paidDevOverride();
  }

  return ref.watch(billingPlanProvider).valueOrNull ?? BillingPlan.free();
});

final isPremiumOverrideProvider = Provider<bool>((ref) {
  const isPremium = bool.fromEnvironment('PREMIUM', defaultValue: false);
  return isPremium;
});
