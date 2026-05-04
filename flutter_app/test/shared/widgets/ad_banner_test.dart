import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/shared/models/billing_plan.dart';
import 'package:flutter_app/shared/widgets/ad_banner.dart';

void main() {
  group('AdBanner', () {
    testWidgets('renders empty SizedBox when plan is paid', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            billingPlanProvider.overrideWith(
              (ref) async =>
                  const BillingPlan(plan: PlanStatus.paid, status: 'active'),
            ),
          ],
          child: const MaterialApp(home: Scaffold(body: AdBanner())),
        ),
      );

      // Paid → no AdWidget mounted, only the empty SizedBox placeholder.
      expect(find.byType(AdBanner), findsOneWidget);
      final sizedBox = tester.widget<SizedBox>(
        find.descendant(
          of: find.byType(AdBanner),
          matching: find.byType(SizedBox),
        ),
      );
      expect(sizedBox.width, null);
      expect(sizedBox.height, null);
    });

    testWidgets('does not throw when plan is free (SDK mocked by test env)', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            billingPlanProvider.overrideWith(
              (ref) async =>
                  const BillingPlan(plan: PlanStatus.free, status: 'unknown'),
            ),
          ],
          child: const MaterialApp(home: Scaffold(body: AdBanner())),
        ),
      );

      // In widget tests the AdMob SDK is not initialized, so BannerAd.load()
      // will fail silently (our onAdFailedToLoad handler disposes the ad).
      // Assertion: the widget tree builds without exceptions and AdBanner
      // is present.
      await tester.pump();
      expect(find.byType(AdBanner), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
