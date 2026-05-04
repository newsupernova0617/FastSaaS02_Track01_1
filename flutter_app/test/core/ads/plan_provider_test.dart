import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/shared/models/billing_plan.dart';

void main() {
  group('planProvider', () {
    test('returns PlanStatus.free by default', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(container.read(planProvider), PlanStatus.free);
    });

    test('can be overridden to PlanStatus.paid for testing', () async {
      final container = ProviderContainer(
        overrides: [
          billingPlanProvider.overrideWith(
            (ref) async =>
                const BillingPlan(plan: PlanStatus.paid, status: 'active'),
          ),
        ],
      );
      addTearDown(container.dispose);

      await container.read(billingPlanProvider.future);
      expect(container.read(planProvider), PlanStatus.paid);
    });
  });
}
