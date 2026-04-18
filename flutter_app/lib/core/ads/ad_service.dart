import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:flutter_app/core/logger/logger.dart';

/// One-time initialization of the AdMob SDK. Call once from `main()`.
///
/// Errors are caught and logged — a failure here must NOT prevent the app
/// from starting. Ads will simply not load if initialization fails.
///
/// Web is skipped entirely: google_mobile_ads has no web implementation
/// and every call throws MissingPluginException.
class AdService {
  static Future<void> initialize() async {
    if (kIsWeb) return;
    try {
      await MobileAds.instance.initialize();
      Logger().info('AdMob SDK initialized');
    } catch (e, st) {
      Logger().error('AdMob SDK init failed: $e', error: e, stackTrace: st);
    }
  }
}
