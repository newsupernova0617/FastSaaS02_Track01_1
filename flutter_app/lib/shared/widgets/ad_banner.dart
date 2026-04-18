import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:flutter_app/core/ads/ad_ids.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/core/logger/logger.dart';

/// A reusable banner ad widget. Loads a BannerAd when the user's plan is
/// [PlanStatus.free]; renders an empty [SizedBox] for paid users.
///
/// Drop it anywhere in the tree — the plan check is self-contained. On
/// load failure the ad is silently hidden (no retry).
class AdBanner extends ConsumerStatefulWidget {
  const AdBanner({super.key});

  @override
  ConsumerState<AdBanner> createState() => _AdBannerState();
}

class _AdBannerState extends ConsumerState<AdBanner> {
  BannerAd? _ad;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) return; // google_mobile_ads has no web implementation
    final plan = ref.read(planProvider);
    if (plan == PlanStatus.free) {
      _loadAd();
    }
  }

  void _loadAd() {
    final ad = BannerAd(
      adUnitId: AdIds.banner,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (_) {
          if (!mounted) return;
          setState(() => _loaded = true);
        },
        onAdFailedToLoad: (ad, err) {
          Logger().warn('Banner ad failed to load: ${err.message}');
          ad.dispose();
        },
      ),
    );
    _ad = ad;
    ad.load();
  }

  @override
  void dispose() {
    if (!kIsWeb) _ad?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _ad == null) return const SizedBox();
    return SizedBox(
      width: _ad!.size.width.toDouble(),
      height: _ad!.size.height.toDouble(),
      child: AdWidget(ad: _ad!),
    );
  }
}
