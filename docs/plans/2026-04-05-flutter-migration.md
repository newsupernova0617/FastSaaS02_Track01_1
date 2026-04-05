# Flutter Frontend Migration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Migrate the React+Vite frontend to Flutter while keeping the Hono backend unchanged.

**Architecture:** Feature-first Flutter project with Riverpod state management, Dio HTTP client, Supabase auth, and Platform Channels for Android-native features (Floating Overlay, Foreground Service).

**Tech Stack:** Flutter 3.x, Riverpod, Dio, supabase_flutter, go_router, fl_chart, table_calendar, freezed, flutter_foreground_task

---

## Task 1: Create Flutter Project & Configure Dependencies

**Files:**
- Create: `flutter_app/` (entire Flutter project scaffold)
- Modify: `flutter_app/pubspec.yaml`

**Step 1: Create Flutter project**
```bash
cd /home/yj437/coding/mingunFastSaaS_Error_fixed
flutter create flutter_app --org com.fastsaas02 --platforms android,ios,web
```

**Step 2: Replace pubspec.yaml with all required dependencies** (Riverpod, Dio, supabase_flutter, go_router, fl_chart, table_calendar, freezed, image_picker, flutter_foreground_task, intl, shared_preferences)

**Step 3: Run `flutter pub get`**

**Step 4: Commit**
```bash
git add flutter_app/ && git commit -m "feat: create Flutter project with dependencies"
```

---

## Task 2: App Theme & Constants

**Files:**
- Create: `flutter_app/lib/core/theme/app_theme.dart`
- Create: `flutter_app/lib/core/constants/app_constants.dart`
- Create: `flutter_app/lib/core/constants/categories.dart`

Material 3 theme matching React design: bg `#f8f8fc`, expense red `#EF4444`, income blue `#3B82F6`, rounded cards (16px radius). Categories: 식비/교통/쇼핑/의료/문화여가/월세/기타 (expense), 월급/부업/용돈/기타 (income). Constants: API base URL, Supabase URL/key via `String.fromEnvironment`.

**Commit:** `feat: add theme, constants, and categories`

---

## Task 3: Data Models (freezed)

**Files:**
- Create: `flutter_app/lib/shared/models/transaction.dart`
- Create: `flutter_app/lib/shared/models/chat_message.dart`
- Create: `flutter_app/lib/shared/models/summary_row.dart`
- Create: `flutter_app/lib/shared/models/ai_action_response.dart`

1:1 mapping from TypeScript types in `frontend/src/api.ts`. Use `@JsonKey(name: 'user_id')` for snake_case fields. Run `dart run build_runner build --delete-conflicting-outputs`.

**Commit:** `feat: add freezed data models`

---

## Task 4: API Client (Dio)

**Files:**
- Create: `flutter_app/lib/core/api/api_client.dart`
- Create: `flutter_app/lib/core/api/api_interceptor.dart`

Mirror existing `frontend/src/api.ts`:
- `getTransactions(date?)` → `GET /api/transactions`
- `addTransaction(data)` → `POST /api/transactions`
- `deleteTransaction(id)` → `DELETE /api/transactions/:id`
- `getSummary(month)` → `GET /api/transactions/summary`
- `sendAIMessage(text)` → `POST /api/ai/action`
- `getChatHistory(limit?, before?)` → `GET /api/ai/chat/history`
- `clearChatHistory()` → `DELETE /api/ai/chat/history`

Interceptor: attach JWT from Supabase session, handle 401 refresh.

**Commit:** `feat: add Dio API client with auth interceptor`

---

## Task 5: Supabase Auth & Riverpod Providers

**Files:**
- Create: `flutter_app/lib/core/auth/supabase_auth.dart`
- Create: `flutter_app/lib/shared/providers/auth_provider.dart`
- Create: `flutter_app/lib/shared/providers/api_provider.dart`
- Create: `flutter_app/lib/shared/providers/transaction_provider.dart`

Auth: Initialize supabase_flutter with deep link `com.fastsaas02.app://auth/callback`. Providers: `authStateProvider` (StreamProvider), `apiClientProvider`, `transactionsProvider(date)`, `summaryProvider(month)`.

**Commit:** `feat: add Supabase auth and Riverpod providers`

---

## Task 6: Router & App Shell

**Files:**
- Create: `flutter_app/lib/app.dart`
- Modify: `flutter_app/lib/main.dart`
- Create: `flutter_app/lib/shared/widgets/bottom_nav_shell.dart`

go_router: `/login`, `/record`, `/calendar`, `/stats`, `/ai`. ShellRoute for bottom nav. Auth redirect. Material 3 NavigationBar with 4 items: 기록/달력/통계/AI. main.dart: init Supabase, ProviderScope, run App.

**Commit:** `feat: add router, app shell, and bottom navigation`

---

## Task 7: Login Page

**Files:**
- Create: `flutter_app/lib/features/auth/login_page.dart`

Centered layout, "가계부" title, Google button (white), Kakao button (#FEE500). Calls auth provider.

**Commit:** `feat: add login page with OAuth buttons`

---

## Task 8: Record Page

**Files:**
- Create: `flutter_app/lib/features/record/record_page.dart`

Expense/Income toggle, date picker, amount input (numeric), category grid (3 cols), memo input, submit button (red/blue by type).

**Commit:** `feat: add record page for income/expense`

---

## Task 9: Calendar Page

**Files:**
- Create: `flutter_app/lib/features/calendar/calendar_page.dart`

table_calendar with month nav, income/expense dots, selected date transaction list, daily totals, transaction cards.

**Commit:** `feat: add calendar page with transaction list`

---

## Task 10: Stats Page

**Files:**
- Create: `flutter_app/lib/features/stats/stats_page.dart`

fl_chart donut pie chart, month nav, summary cards (total expense/income), category detail with percentage bars.

**Commit:** `feat: add stats page with charts`

---

## Task 11: AI Chat Page

**Files:**
- Create: `flutter_app/lib/features/ai_chat/ai_chat_page.dart`
- Create: `flutter_app/lib/features/ai_chat/widgets/chat_bubble.dart`
- Create: `flutter_app/lib/features/ai_chat/widgets/chat_input.dart`

Chat message list, bubbles (user right/blue, assistant left/gray), text input + send button, optimistic UI, loading indicator, error snackbar.

**Commit:** `feat: add AI chat page`

---

## Task 12: Android Native - Floating Overlay & Foreground Service

**Files:**
- Create: `flutter_app/lib/native/overlay/overlay_service.dart`
- Create: `flutter_app/lib/native/foreground_service/foreground_service_manager.dart`
- Modify: `flutter_app/android/app/src/main/AndroidManifest.xml`
- Create: `flutter_app/android/app/src/main/kotlin/.../OverlayService.kt`

Permissions: `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`, `POST_NOTIFICATIONS`. Kotlin OverlayService with WindowManager. MethodChannel `com.fastsaas02.app/overlay`: startOverlay/stopOverlay/sendMessage. flutter_foreground_task for background persistence.

**Commit:** `feat: add floating overlay and foreground service (Android)`

---

## Task 13: Platform Configuration & Build Verification

**Files:**
- Modify: `flutter_app/android/app/build.gradle.kts` (minSdk 23, applicationId)
- Modify: `flutter_app/ios/Runner/Info.plist` (URL scheme, camera usage)
- Modify: `flutter_app/web/index.html` (title)
- Modify: `backend/src/index.ts` (add Flutter origins to CORS)

Verify: `flutter analyze`, `flutter build apk --debug`, `flutter build web`.

**Commit:** `feat: configure platform builds and verify compilation`

---

## Task 14: Final Integration Test

Run backend (`npm run dev`) + Flutter app (`flutter run -d chrome`).

Checklist:
- [ ] Google OAuth login
- [ ] Add income/expense
- [ ] Calendar shows transactions
- [ ] Stats pie chart renders
- [ ] AI chat send/receive
- [ ] Bottom nav works
- [ ] Logout works

**Final commit:** `feat: complete Flutter frontend migration`
