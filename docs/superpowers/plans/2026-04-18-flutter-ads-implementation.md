# Flutter AdMob Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Google AdMob (banner + interstitial) into the Flutter app for Freemium monetization. Free users see ads; Paid users see no ads. No backend changes — plan status is abstracted behind a Riverpod provider that currently returns `Free` for all users.

**Architecture:** Add `core/ads/` module with three files (`ad_service`, `ad_ids`, `plan_provider`) and two shared widgets (`AdBanner`, `AdInterstitialTrigger`). Initialize SDK once in `main.dart`, drop `AdBanner()` into list/report screens, call `AdInterstitialTrigger.showIfFree(ref)` after report renders. Test-mode ad IDs by default; production IDs selected via `--dart-define=ADMOB_MODE=prod` at build time.

**Tech Stack:** Flutter, Riverpod, `google_mobile_ads: ^5.1.0`, Android only (iOS deferred).

**Spec:** `docs/superpowers/specs/2026-04-18-flutter-ads-design.md`

**Scope deviation from spec:** Banner placement excludes the chat screen (`SessionSidebar` is too narrow for 320px banner, and placing a banner below the chat body contradicts the "no ads in chat/ai_chat" rule). Banner target screens: **CalendarPage, StatsPage, ReportDetailPage** only. Interstitial trigger remains report generation completion (`ReportDetailPage.initState`).

---

## File Structure

**Created:**
- `flutter_app/lib/core/ads/ad_service.dart` — AdMob SDK initialization wrapper
- `flutter_app/lib/core/ads/ad_ids.dart` — Test/prod ad unit ID selection via `dart-define`
- `flutter_app/lib/core/ads/plan_provider.dart` — `PlanStatus` enum + Riverpod provider
- `flutter_app/lib/shared/widgets/ad_banner.dart` — Reusable banner widget with plan check
- `flutter_app/lib/shared/widgets/ad_interstitial_trigger.dart` — Interstitial preload/show helper
- `flutter_app/test/core/ads/plan_provider_test.dart`
- `flutter_app/test/core/ads/ad_ids_test.dart`
- `flutter_app/test/shared/widgets/ad_banner_test.dart`

**Modified:**
- `flutter_app/pubspec.yaml` — add `google_mobile_ads` dependency
- `flutter_app/android/app/src/main/AndroidManifest.xml` — add AdMob App ID meta-data
- `flutter_app/lib/main.dart` — initialize AdMob SDK + preload first interstitial
- `flutter_app/lib/features/calendar/calendar_page.dart` — bottom `AdBanner`
- `flutter_app/lib/features/stats/stats_page.dart` — bottom `AdBanner`
- `flutter_app/lib/features/reports/report_detail_page.dart` — bottom `AdBanner` + interstitial trigger

---

## Task 1: Add `google_mobile_ads` dependency and AndroidManifest meta-data

**Files:**
- Modify: `flutter_app/pubspec.yaml`
- Modify: `flutter_app/android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Add dependency to `pubspec.yaml`**

Open `flutter_app/pubspec.yaml`. Inside the `dependencies:` block, after the line `flutter_dotenv: ^5.1.0`, add:

```yaml
  google_mobile_ads: ^5.1.0
```

The dependencies section should now end with:
```yaml
  shared_preferences: ^2.2.0
  flutter_dotenv: ^5.1.0
  google_mobile_ads: ^5.1.0
```

- [ ] **Step 2: Install the new package**

Run from `flutter_app/`:
```bash
flutter pub get
```
Expected: `Resolving dependencies...` followed by `Got dependencies!` or equivalent success message. No errors.

- [ ] **Step 3: Add AdMob App ID meta-data to `AndroidManifest.xml`**

Open `flutter_app/android/app/src/main/AndroidManifest.xml`. Inside the `<application>` tag, just before the existing `<meta-data android:name="flutterEmbedding" ...>` line (around line 71), add:

```xml
        <!-- AdMob App ID (Google official test App ID for Android).
             Replace with real App ID when AdMob account is set up.
             Docs: https://developers.google.com/admob/flutter/quick-start -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-3940256099942544~3347511713" />
```

The `INTERNET` permission (line 7) already exists, so no permission changes needed.

- [ ] **Step 4: Verify build**

Run from `flutter_app/`:
```bash
flutter analyze
```
Expected: `No issues found!` (or only pre-existing warnings unrelated to our changes).

- [ ] **Step 5: Commit**

```bash
git add flutter_app/pubspec.yaml flutter_app/pubspec.lock flutter_app/android/app/src/main/AndroidManifest.xml
git commit -m "feat(ads): add google_mobile_ads dependency and AdMob App ID meta-data"
```

---

## Task 2: Create `PlanProvider` with tests

**Files:**
- Create: `flutter_app/lib/core/ads/plan_provider.dart`
- Create: `flutter_app/test/core/ads/plan_provider_test.dart`

- [ ] **Step 1: Create the test file**

Create `flutter_app/test/core/ads/plan_provider_test.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';

void main() {
  group('planProvider', () {
    test('returns PlanStatus.free by default', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(container.read(planProvider), PlanStatus.free);
    });

    test('can be overridden to PlanStatus.paid for testing', () {
      final container = ProviderContainer(
        overrides: [
          planProvider.overrideWithValue(PlanStatus.paid),
        ],
      );
      addTearDown(container.dispose);

      expect(container.read(planProvider), PlanStatus.paid);
    });
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `flutter_app/`:
```bash
flutter test test/core/ads/plan_provider_test.dart
```
Expected: FAIL. Error should mention that `plan_provider.dart` or `planProvider`/`PlanStatus` cannot be found.

- [ ] **Step 3: Create the implementation**

Create `flutter_app/lib/core/ads/plan_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Current subscription plan status of the user.
enum PlanStatus { free, paid }

/// Returns the current user's plan.
///
/// Current behavior: all users treated as [PlanStatus.free] (backend plan
/// field not available yet). When the backend exposes plan data, replace
/// the body of this provider to query it — consumers (`AdBanner`,
/// `AdInterstitialTrigger`) do not need to change.
///
/// Dev override: build with `--dart-define=PREMIUM=true` to simulate the
/// paid plan locally (hides all ads) — useful for UX verification.
final planProvider = Provider<PlanStatus>((ref) {
  const isPremium = bool.fromEnvironment('PREMIUM', defaultValue: false);
  return isPremium ? PlanStatus.paid : PlanStatus.free;
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
flutter test test/core/ads/plan_provider_test.dart
```
Expected: PASS. Both tests green.

- [ ] **Step 5: Commit**

```bash
git add flutter_app/lib/core/ads/plan_provider.dart flutter_app/test/core/ads/plan_provider_test.dart
git commit -m "feat(ads): add PlanProvider abstraction (free hardcoded, dart-define override)"
```

---

## Task 3: Create `AdIds` with tests

**Files:**
- Create: `flutter_app/lib/core/ads/ad_ids.dart`
- Create: `flutter_app/test/core/ads/ad_ids_test.dart`

- [ ] **Step 1: Create the test file**

Create `flutter_app/test/core/ads/ad_ids_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/core/ads/ad_ids.dart';

void main() {
  group('AdIds', () {
    test('banner returns the Google test banner ID by default', () {
      expect(AdIds.banner, 'ca-app-pub-3940256099942544/6300978111');
    });

    test('interstitial returns the Google test interstitial ID by default', () {
      expect(AdIds.interstitial, 'ca-app-pub-3940256099942544/1033173712');
    });
  });
}
```

*Note: tests run with default `ADMOB_MODE` (unset → `test`). Testing the `prod` branch requires a separate build with `--dart-define=ADMOB_MODE=prod`; we verify manually at release time.*

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
flutter test test/core/ads/ad_ids_test.dart
```
Expected: FAIL. Error about missing `ad_ids.dart` or `AdIds` class.

- [ ] **Step 3: Create the implementation**

Create `flutter_app/lib/core/ads/ad_ids.dart`:

```dart
/// AdMob ad unit IDs. Uses Google's official test IDs by default; switches
/// to production IDs when built with `--dart-define=ADMOB_MODE=prod`.
///
/// Replace `_prodBanner` and `_prodInterstitial` once AdMob account is
/// created and ad units are generated.
class AdIds {
  static const _mode =
      String.fromEnvironment('ADMOB_MODE', defaultValue: 'test');

  // Google official test ad unit IDs for Android.
  // https://developers.google.com/admob/flutter/test-ads
  static const _testBanner = 'ca-app-pub-3940256099942544/6300978111';
  static const _testInterstitial = 'ca-app-pub-3940256099942544/1033173712';

  // Placeholders — replace after creating real ad units in AdMob console.
  static const _prodBanner = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  static const _prodInterstitial = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

  static String get banner => _mode == 'prod' ? _prodBanner : _testBanner;
  static String get interstitial =>
      _mode == 'prod' ? _prodInterstitial : _testInterstitial;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
flutter test test/core/ads/ad_ids_test.dart
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add flutter_app/lib/core/ads/ad_ids.dart flutter_app/test/core/ads/ad_ids_test.dart
git commit -m "feat(ads): add AdIds constants with test/prod dart-define switch"
```

---

## Task 4: Create `AdService` and initialize in `main.dart`

**Files:**
- Create: `flutter_app/lib/core/ads/ad_service.dart`
- Modify: `flutter_app/lib/main.dart`

- [ ] **Step 1: Create `ad_service.dart`**

Create `flutter_app/lib/core/ads/ad_service.dart`:

```dart
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:flutter_app/core/logger/logger.dart';

/// One-time initialization of the AdMob SDK. Call once from `main()`.
///
/// Errors are caught and logged — a failure here must NOT prevent the app
/// from starting. Ads will simply not load if initialization fails.
class AdService {
  static Future<void> initialize() async {
    try {
      await MobileAds.instance.initialize();
      Logger().info('AdMob SDK initialized');
    } catch (e, st) {
      Logger().error('AdMob SDK init failed: $e', error: e, stackTrace: st);
    }
  }
}
```

- [ ] **Step 2: Wire initialization into `main.dart`**

Open `flutter_app/lib/main.dart`. Add this import with the other `flutter_app` imports (after line 8):

```dart
import 'package:flutter_app/core/ads/ad_service.dart';
```

Then, between the `.env` load and Supabase init (after line 28 `await dotenv.load(...)`, before line 31's try block for Supabase), add:

```dart
  // Initialize AdMob SDK. Failure is logged and swallowed — app continues.
  await AdService.initialize();
```

The final `main()` function order is: `WidgetsFlutterBinding` → `Logger.init` → `dotenv.load` → `AdService.initialize` → `SupabaseAuthService.initialize` → `installQuickEntryHandler` → foreground service → `runApp`.

- [ ] **Step 3: Verify build still works**

Run from `flutter_app/`:
```bash
flutter analyze
```
Expected: `No issues found!` (or only pre-existing warnings).

- [ ] **Step 4: Commit**

```bash
git add flutter_app/lib/core/ads/ad_service.dart flutter_app/lib/main.dart
git commit -m "feat(ads): initialize AdMob SDK at app startup"
```

---

## Task 5: Create `AdBanner` widget with tests

**Files:**
- Create: `flutter_app/lib/shared/widgets/ad_banner.dart`
- Create: `flutter_app/test/shared/widgets/ad_banner_test.dart`

- [ ] **Step 1: Create the widget test**

Create `flutter_app/test/shared/widgets/ad_banner_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/shared/widgets/ad_banner.dart';

void main() {
  group('AdBanner', () {
    testWidgets('renders empty SizedBox when plan is paid',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            planProvider.overrideWithValue(PlanStatus.paid),
          ],
          child: const MaterialApp(
            home: Scaffold(body: AdBanner()),
          ),
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

    testWidgets('does not throw when plan is free (SDK mocked by test env)',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            planProvider.overrideWithValue(PlanStatus.free),
          ],
          child: const MaterialApp(
            home: Scaffold(body: AdBanner()),
          ),
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
flutter test test/shared/widgets/ad_banner_test.dart
```
Expected: FAIL. Error about missing `ad_banner.dart` or `AdBanner` class.

- [ ] **Step 3: Create the widget**

Create `flutter_app/lib/shared/widgets/ad_banner.dart`:

```dart
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
    _ad?.dispose();
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
flutter test test/shared/widgets/ad_banner_test.dart
```
Expected: PASS. Both widget tests green.

- [ ] **Step 5: Commit**

```bash
git add flutter_app/lib/shared/widgets/ad_banner.dart flutter_app/test/shared/widgets/ad_banner_test.dart
git commit -m "feat(ads): add AdBanner widget with plan-aware rendering"
```

---

## Task 6: Create `AdInterstitialTrigger` helper

**Files:**
- Create: `flutter_app/lib/shared/widgets/ad_interstitial_trigger.dart`
- Modify: `flutter_app/lib/main.dart`

- [ ] **Step 1: Create the helper**

Create `flutter_app/lib/shared/widgets/ad_interstitial_trigger.dart`:

```dart
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
```

- [ ] **Step 2: Preload the first interstitial at app startup**

Open `flutter_app/lib/main.dart`. Add this import with the other `flutter_app` imports (right after the `ad_service.dart` import):

```dart
import 'package:flutter_app/shared/widgets/ad_interstitial_trigger.dart';
```

Then, immediately after `await AdService.initialize();`, add:

```dart
  // Preload the first interstitial so it's ready by the time the user
  // generates their first report. Failure is silently swallowed.
  AdInterstitialTrigger.preload();
```

- [ ] **Step 3: Verify analyze passes**

Run from `flutter_app/`:
```bash
flutter analyze
```
Expected: `No issues found!` (or only pre-existing warnings).

- [ ] **Step 4: Commit**

```bash
git add flutter_app/lib/shared/widgets/ad_interstitial_trigger.dart flutter_app/lib/main.dart
git commit -m "feat(ads): add AdInterstitialTrigger with preload at app startup"
```

---

## Task 7: Add `AdBanner` to `CalendarPage`

**Files:**
- Modify: `flutter_app/lib/features/calendar/calendar_page.dart`

- [ ] **Step 1: Read the current page structure**

Before editing, read `flutter_app/lib/features/calendar/calendar_page.dart` in full to locate the `build` method and the `Scaffold`/top-level widget structure. The banner goes at the very bottom of the page body, inside a `SafeArea` if one exists, above the bottom nav / tab bar.

- [ ] **Step 2: Add the import**

At the top of `calendar_page.dart`, with the other `flutter_app` imports, add:

```dart
import 'package:flutter_app/shared/widgets/ad_banner.dart';
```

- [ ] **Step 3: Insert `AdBanner` at the bottom of the page body**

In `CalendarPage`'s `build` method, locate the root body widget of the `Scaffold`. If the body is a `Column`, add `const AdBanner()` as the last child. If the body is any other widget (e.g., `SingleChildScrollView`, `ListView`), wrap it in a `Column` like so:

```dart
body: Column(
  children: [
    Expanded(child: <existing body widget>),
    const AdBanner(),
  ],
),
```

The banner widget self-manages its size (returns empty `SizedBox` when not loaded) so no explicit padding or height is needed.

- [ ] **Step 4: Manual verification — calendar page builds**

Run from `flutter_app/`:
```bash
flutter analyze lib/features/calendar/
```
Expected: No analyzer errors.

- [ ] **Step 5: Commit**

```bash
git add flutter_app/lib/features/calendar/calendar_page.dart
git commit -m "feat(ads): show banner ad at bottom of calendar page"
```

---

## Task 8: Add `AdBanner` to `StatsPage`

**Files:**
- Modify: `flutter_app/lib/features/stats/stats_page.dart`

- [ ] **Step 1: Read the current page structure**

Read `flutter_app/lib/features/stats/stats_page.dart` in full to locate the `Scaffold` and its `body` widget (expected to be a `TabBarView`).

- [ ] **Step 2: Add the import**

At the top of `stats_page.dart`, with the other `flutter_app` imports, add:

```dart
import 'package:flutter_app/shared/widgets/ad_banner.dart';
```

- [ ] **Step 3: Insert `AdBanner` at the bottom of the Scaffold body**

`StatsPage` uses `DefaultTabController` + `Scaffold` with a `TabBar` at the top and `TabBarView` in the body (two tabs: 통계 / 리포트). The banner should appear below both tabs.

Wrap the existing `Scaffold`'s `body` in a `Column`:

```dart
body: Column(
  children: [
    Expanded(child: <existing body widget — the TabBarView>),
    const AdBanner(),
  ],
),
```

Important: if the existing body is `TabBarView(...)`, place it inside the `Expanded`. Do not remove or restructure the `DefaultTabController` or `TabBar`.

- [ ] **Step 4: Manual verification — stats page builds**

Run:
```bash
flutter analyze lib/features/stats/
```
Expected: No analyzer errors.

- [ ] **Step 5: Commit**

```bash
git add flutter_app/lib/features/stats/stats_page.dart
git commit -m "feat(ads): show banner ad at bottom of stats page"
```

---

## Task 9: Add `AdBanner` + interstitial trigger to `ReportDetailPage`

**Files:**
- Modify: `flutter_app/lib/features/reports/report_detail_page.dart`

- [ ] **Step 1: Read the current page structure**

Read `flutter_app/lib/features/reports/report_detail_page.dart` in full to locate (a) whether `_ReportDetailPageState` already has an `initState` override (so you know whether to add a new one or extend it), and (b) the `Scaffold` structure in `build` — especially any existing `bottomNavigationBar` or `persistentFooterButtons` that the `AdBanner` must sit above.

- [ ] **Step 2: Add the imports**

At the top of `report_detail_page.dart`, with the other imports, add:

```dart
import '../../shared/widgets/ad_banner.dart';
import '../../shared/widgets/ad_interstitial_trigger.dart';
```

- [ ] **Step 3: Trigger the interstitial when the page opens**

In `_ReportDetailPageState`, add (or if `initState` already exists, extend it):

```dart
  @override
  void initState() {
    super.initState();
    // Show interstitial ad on report generation complete (Free users only,
    // silently skipped if no ad is cached). Deferred to post-frame so the
    // report UI renders first.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      AdInterstitialTrigger.showIfFree(ref);
    });
  }
```

- [ ] **Step 4: Insert `AdBanner` at the bottom of the Scaffold body**

Locate the `Scaffold` in `build`. Wrap its `body` in a `Column`:

```dart
body: Column(
  children: [
    Expanded(child: <existing body widget>),
    const AdBanner(),
  ],
),
```

Do not touch the bottom action bar (`"저장하기"` / `"삭제하기"` buttons) — place `AdBanner` **above** any `bottomNavigationBar` / `persistentFooterButtons` if present.

- [ ] **Step 5: Verify build**

Run:
```bash
flutter analyze lib/features/reports/
```
Expected: No analyzer errors.

- [ ] **Step 6: Commit**

```bash
git add flutter_app/lib/features/reports/report_detail_page.dart
git commit -m "feat(ads): show banner + interstitial on report detail page"
```

---

## Task 10: Run the full test suite

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

Run from `flutter_app/`:
```bash
flutter test
```
Expected: All tests pass (existing + new). No failures, no skipped tests related to our changes.

- [ ] **Step 2: Run analyzer over the full project**

```bash
flutter analyze
```
Expected: `No issues found!` (or only pre-existing warnings unrelated to the ads module).

- [ ] **Step 3: Commit (only if any fixes were applied in this task)**

If steps 1–2 revealed issues and you fixed them, commit:
```bash
git add -- <fixed files>
git commit -m "fix(ads): resolve <specific issue> from full suite run"
```
If no fixes were needed, skip.

---

## Task 11: Manual verification on Android

**Files:** none (runtime verification)

This task cannot be automated — it requires a physical Android device or emulator.

- [ ] **Step 1: Launch the app in debug mode**

Run from `flutter_app/`:
```bash
flutter run -d <android-device-or-emulator>
```
Expected: App launches without crash. Log output contains `AdMob SDK initialized` (from `AdService.initialize`).

- [ ] **Step 2: Banner visibility checklist**

Navigate through the app and confirm each of the following:

| Screen | Expected |
|--------|----------|
| Login/signup (`auth`) | NO banner |
| Session chat (`chat` — message area) | NO banner |
| AI chat (`ai_chat`) | NO banner |
| Record input (`record`) | NO banner |
| **Calendar page** | Banner labelled **"Test Ad"** at bottom |
| **Stats page — 통계 tab** | Banner labelled "Test Ad" at bottom |
| **Stats page — 리포트 tab** | Banner labelled "Test Ad" at bottom |
| **Report detail page** | Banner labelled "Test Ad" at bottom |

- [ ] **Step 3: Interstitial verification**

1. Generate a report via the AI chat flow (e.g., "이번달 리포트 만들어줘").
2. Tap the resulting "View Report" button.
3. Expected: a test interstitial ad (full-screen) appears after a brief delay. The "Close" button dismisses it.
4. Return to chat, generate a second report, tap View Report again.
5. Expected: another interstitial appears (spec: no frequency cap).

If the interstitial does not appear the very first time, wait a moment (preload may not have finished) and try again — this is expected behavior.

- [ ] **Step 4: Airplane mode (graceful degradation)**

1. Enable airplane mode on the device.
2. Relaunch the app (or navigate away and back to a banner screen).
3. Expected: app runs normally; banner slots are empty (no visible banners, no error UI, no crash).
4. Generate a report — UI still works; interstitial is silently skipped.

- [ ] **Step 5: Paid user override**

Rebuild the app with the premium flag:
```bash
flutter run -d <device> --dart-define=PREMIUM=true
```
Expected:
- **No banners** on any screen (calendar, stats, report detail).
- **No interstitial** when generating/viewing reports.

- [ ] **Step 6: Record results**

Create or update a short note in the PR description / commit body listing the outcome of each checklist item above. No file commit is required unless issues are found.

---

## Task 12: Post-implementation notes — items deferred to later work

The following items are **out of scope** for this plan and are captured here only for traceability. No action needed right now.

- **iOS support** — requires ATT consent, `Info.plist` entries (`SKAdNetworkItems`, `NSUserTrackingUsageDescription`), and updated ad IDs.
- **Production ad unit IDs** — `_prodBanner` and `_prodInterstitial` in `ad_ids.dart` remain placeholders until AdMob account is set up. A separate commit will replace them and verify a `--dart-define=ADMOB_MODE=prod` release build.
- **Backend plan connection** — when backend exposes `users.plan`, replace the body of `planProvider` in `plan_provider.dart` with an API/`Supabase.auth.currentUser.userMetadata` lookup. Consumers do not change.
- **Frequency cap** — current policy is "no cap" (user decision). If monitoring shows ad-related churn, add a `SharedPreferences`-backed daily cap in `AdInterstitialTrigger.showIfFree`.
- **AdMob mediation (AppLovin MAX)** — defer until DAU ≥ ~10k.
