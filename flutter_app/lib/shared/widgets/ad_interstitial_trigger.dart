import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:flutter_app/core/ads/ad_ids.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/core/logger/logger.dart';

/// Helper for interstitial (full-screen) ads. Call [preload] at app start
/// and after each show; call [showIfFree] when a good display moment
/// arises (e.g., after a report finishes generating).
///
/// If a cached ad is not yet ready when [showIfFree] is called, the call
/// is a no-op — we never block the user for an ad.
class AdInterstitialTrigger {
  static InterstitialAd? _cached;
  static bool _loading = false;

  /// Kicks off loading of the next interstitial ad. Safe to call repeatedly
  /// — if a load is already in progress or an ad is already cached, does
  /// nothing.
  static void preload() {
    if (kIsWeb) return;
    if (_cached != null || _loading) return;
    _loading = true;
    InterstitialAd.load(
      adUnitId: AdIds.interstitial,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _cached = ad;
          _loading = false;
        },
        onAdFailedToLoad: (err) {
          Logger().warn('Interstitial failed to load: ${err.message}');
          _loading = false;
        },
      ),
    );
  }

  /// Shows the cached interstitial ad if the user is on [PlanStatus.free]
  /// and an ad is ready. Silently skips otherwise. After the ad closes
  /// (success or failure), preloads the next one.
  static Future<void> showIfFree(WidgetRef ref) async {
    if (kIsWeb) return;
    final plan = ref.read(planProvider);
    if (plan != PlanStatus.free) return;

    final ad = _cached;
    if (ad == null) return;
    _cached = null;

    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        preload();
      },
      onAdFailedToShowFullScreenContent: (ad, err) {
        Logger().warn('Interstitial show failed: ${err.message}');
        ad.dispose();
        preload();
      },
    );
    await ad.show();
  }
}
