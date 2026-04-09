# Report Naming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to name reports when saving from Chat and rename them in Stats page detail view.

**Architecture:** 
- Backend: Add `PATCH /api/reports/:id` endpoint to update report title
- Frontend: Create reusable `ReportNameDialog` widget, integrate into Chat save flow and Stats detail page
- Validation: Input constraints (1-100 chars), userId filtering, error handling

**Tech Stack:** Hono (backend), Flutter + Riverpod (frontend), Drizzle ORM (queries)

---

## File Structure

**Backend:**
- Modify: `backend/src/routes/reports.ts` — add PATCH endpoint
- Modify: `backend/src/services/reports.ts` — add updateReportTitle function
- Modify: `backend/tests/routes/reports.test.ts` — add tests for PATCH

**Frontend:**
- Create: `flutter_app/lib/features/reports/widgets/report_name_dialog.dart` — reusable dialog
- Modify: `flutter_app/lib/shared/providers/report_provider.dart` — add updateReportProvider
- Modify: `flutter_app/lib/features/ai_chat/widgets/report_card.dart` — integrate save dialog
- Modify: `flutter_app/lib/features/reports/report_detail_page.dart` — make title editable
- Create: `flutter_app/test/features/reports/widgets/report_name_dialog_test.dart` — widget tests

---

## Task 1: Backend - Create updateReportTitle Service Function

**Files:**
- Modify: `backend/src/services/reports.ts`

**Context:** The backend needs a service function to update a report's title. This will be called by the PATCH endpoint.

- [ ] **Step 1: Open `backend/src/services/reports.ts` and add the update function**

Add this function to the file:

```typescript
export async function updateReportTitle(
  db: Database,
  userId: string,
  reportId: number,
  newTitle: string,
): Promise<Report> {
  // Validate title
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle.length === 0) {
    throw new Error('Report title cannot be empty');
  }
  if (trimmedTitle.length > 100) {
    throw new Error('Report title must be 100 characters or less');
  }

  // Update report (userId filter ensures data isolation)
  const updated = await db
    .update(reports)
    .set({ title: trimmedTitle, updatedAt: new Date() })
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
    .returning();

  if (updated.length === 0) {
    throw new Error('Report not found or permission denied');
  }

  return updated[0];
}
```

- [ ] **Step 2: Verify the function signature and imports**

Ensure the function:
- Takes `db: Database`, `userId: string`, `reportId: number`, `newTitle: string`
- Returns `Promise<Report>`
- Uses `and(eq(...), eq(...))` for userId + reportId filtering (prevents cross-user access)
- Validates title: not empty, max 100 chars, trimmed

---

## Task 2: Backend - Add PATCH Endpoint for Report Update

**Files:**
- Modify: `backend/src/routes/reports.ts`

**Context:** Create the HTTP endpoint that receives the rename request from the client.

- [ ] **Step 1: Open `backend/src/routes/reports.ts` and add the PATCH handler**

Add this route after the existing GET and DELETE routes:

```typescript
// In the reports router, add:
router.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const reportId = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { title } = body;

  if (!title || typeof title !== 'string') {
    return c.json({ error: 'Title is required and must be a string' }, 400);
  }

  try {
    const db = getDb(c.env);
    const updated = await updateReportTitle(db, userId, reportId, title);
    return c.json({ success: true, report: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});
```

- [ ] **Step 2: Verify imports and function name**

Ensure:
- `updateReportTitle` is imported from `../services/reports.ts`
- Request body has `{ title: string }` structure
- Response includes `{ success: true, report: Report }`
- Error responses are `{ error: string }` with 400 status

---

## Task 3: Backend - Add Test for PATCH Endpoint

**Files:**
- Modify: `backend/tests/routes/reports.test.ts`

**Context:** Write tests to verify the PATCH endpoint works correctly and handles errors.

- [ ] **Step 1: Add test for successful report title update**

Add this test to the test file:

```typescript
describe('PATCH /api/reports/:id', () => {
  it('should update report title', async () => {
    const env = createMockEnv();
    const db = getDb(env);
    
    // Create a test report
    const [report] = await db
      .insert(reports)
      .values({
        id: 1,
        userId: 'test-user',
        reportType: 'monthly_summary',
        title: 'Old Title',
        reportData: [],
        createdAt: new Date(),
      })
      .returning();

    const app = createApp(env);
    const res = await app.request(
      new Request('http://localhost/api/reports/1', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify({ title: 'New Title' }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.report.title).toBe('New Title');
  });

  it('should reject empty title', async () => {
    const env = createMockEnv();
    const app = createApp(env);
    
    const res = await app.request(
      new Request('http://localhost/api/reports/999', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify({ title: '' }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('empty');
  });

  it('should reject title > 100 characters', async () => {
    const env = createMockEnv();
    const app = createApp(env);
    
    const longTitle = 'a'.repeat(101);
    const res = await app.request(
      new Request('http://localhost/api/reports/999', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify({ title: longTitle }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('100 characters');
  });

  it('should prevent cross-user access', async () => {
    const env = createMockEnv();
    const db = getDb(env);
    
    // Create report for user-a
    const [report] = await db
      .insert(reports)
      .values({
        id: 1,
        userId: 'user-a',
        reportType: 'monthly_summary',
        title: 'User A Report',
        reportData: [],
        createdAt: new Date(),
      })
      .returning();

    const app = createApp(env);
    
    // Try to update as user-b
    const res = await app.request(
      new Request('http://localhost/api/reports/1', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer user-b-token' }, // Different user
        body: JSON.stringify({ title: 'Hacked Title' }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('not found');
  });
});
```

- [ ] **Step 2: Run the new tests**

```bash
cd backend
npm run test -- tests/routes/reports.test.ts
```

Expected: All 4 new tests pass (or existing tests for PATCH pass once implemented).

---

## Task 4: Frontend - Create Reusable ReportNameDialog Widget

**Files:**
- Create: `flutter_app/lib/features/reports/widgets/report_name_dialog.dart`

**Context:** A reusable dialog widget for entering/editing report names. Used in both Chat save and Stats rename flows.

- [ ] **Step 1: Create the new file with the dialog widget**

```dart
import 'package:flutter/material.dart';

class ReportNameDialog extends StatefulWidget {
  final String initialName;
  final Function(String) onSave;
  final String? title;

  const ReportNameDialog({
    Key? key,
    required this.initialName,
    required this.onSave,
    this.title = '리포트 이름',
  }) : super(key: key);

  @override
  State<ReportNameDialog> createState() => _ReportNameDialogState();
}

class _ReportNameDialogState extends State<ReportNameDialog> {
  late TextEditingController _controller;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialName);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _validateInput(String value) {
    final trimmed = value.trim();
    
    if (trimmed.isEmpty) {
      return '이름을 입력해주세요';
    }
    
    if (trimmed.length > 100) {
      return '100자 이하로 입력해주세요';
    }
    
    return null;
  }

  void _handleSave() {
    final error = _validateInput(_controller.text);
    
    if (error != null) {
      setState(() => _errorMessage = error);
      return;
    }
    
    // Save and close dialog
    widget.onSave(_controller.text.trim());
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title!),
      content: TextField(
        controller: _controller,
        decoration: InputDecoration(
          hintText: '리포트 이름을 입력하세요',
          errorText: _errorMessage,
          border: OutlineInputBorder(),
        ),
        onChanged: (_) {
          // Clear error when user types
          if (_errorMessage != null) {
            setState(() => _errorMessage = null);
          }
        },
        maxLines: 1,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('취소'),
        ),
        ElevatedButton(
          onPressed: _handleSave,
          child: const Text('저장'),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Verify the widget structure**

The dialog should:
- Accept `initialName` (pre-filled in TextField)
- Accept `onSave` callback with trimmed string
- Validate: not empty, max 100 chars
- Show error messages inline
- Have Cancel / Save buttons

---

## Task 5: Frontend - Add updateReportProvider to Report Provider

**Files:**
- Modify: `flutter_app/lib/shared/providers/report_provider.dart`

**Context:** Add a Riverpod provider for the PATCH API call to update report title.

- [ ] **Step 1: Open `report_provider.dart` and add the update provider**

Add this function and provider after the existing report providers:

```dart
// Add import if not present
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Add this provider:
final updateReportProvider = FutureProvider.family<void, (int, String)>((ref, args) async {
  final (reportId, newTitle) = args;
  final dioClient = ref.watch(authenticatedDioProvider);
  
  final response = await dioClient.patch(
    '/api/reports/$reportId',
    data: {'title': newTitle},
  );

  if (response.statusCode != 200) {
    throw Exception('Failed to update report title: ${response.statusMessage}');
  }

  // Invalidate report detail cache so UI refreshes
  ref.invalidate(getReportDetailProvider(reportId));
  // Invalidate report list cache
  ref.invalidate(getReportsProvider((month: null, limit: 50)));
});
```

- [ ] **Step 2: Verify the provider signature**

Ensure:
- Takes `(reportId: int, newTitle: string)` as parameter tuple
- Uses `authenticatedDioProvider` for auto JWT injection
- PATCH to `/api/reports/:id` with `{ title: newTitle }`
- Invalidates both detail and list caches on success
- Throws meaningful error on failure

---

## Task 6: Frontend - Integrate ReportNameDialog into Chat Report Save

**Files:**
- Modify: `flutter_app/lib/features/ai_chat/widgets/report_card.dart`

**Context:** When user clicks "저장하기" on a report card, show the name input dialog before saving.

- [ ] **Step 1: Open `report_card.dart` and add import**

At the top of the file, add:

```dart
import '../../reports/widgets/report_name_dialog.dart';
```

- [ ] **Step 2: Find the "저장하기" button and modify it**

Look for the button that currently calls `_handleSaveReport(report)`. Replace it or wrap it to show the dialog first:

```dart
// Old code (find this):
ElevatedButton(
  onPressed: () => _handleSaveReport(report),
  child: const Text('저장하기'),
)

// New code (replace with):
ElevatedButton(
  onPressed: () {
    showDialog(
      context: context,
      builder: (context) => ReportNameDialog(
        initialName: report.title ?? 'Untitled Report',
        onSave: (String newTitle) {
          // Update the report title and save
          final updatedReport = ReportDetail(
            reportType: report.reportType,
            title: newTitle,  // Use the custom name
            subtitle: report.subtitle,
            reportData: report.reportData,
            params: report.params,
          );
          _handleSaveReport(updatedReport);
        },
      ),
    );
  },
  child: const Text('저장하기'),
)
```

- [ ] **Step 3: Verify the integration**

Check that:
- Dialog shows with `report.title` as default
- User can edit the name
- `onSave` callback receives trimmed name
- `_handleSaveReport` is called with updated report (title changed)
- Dialog closes after save

---

## Task 7: Frontend - Make Report Title Editable in ReportDetailPage

**Files:**
- Modify: `flutter_app/lib/features/reports/report_detail_page.dart`

**Context:** Make the report title tappable to edit. Integrate the rename dialog and call the update API.

- [ ] **Step 1: Add import for the dialog and update provider**

At the top of `report_detail_page.dart`, add:

```dart
import '../../reports/widgets/report_name_dialog.dart';
import 'package:flutter_app/shared/providers/report_provider.dart';
```

Wait, `updateReportProvider` should be in `report_provider.dart`. Make sure it's imported. The file already imports from report_provider, so this should work.

- [ ] **Step 2: Find the title display section (around line 151-154)**

Current code:
```dart
Text(
  report.title,
  style: Theme.of(context).textTheme.headlineSmall,
),
```

Replace with:

```dart
GestureDetector(
  onTap: () {
    showDialog(
      context: context,
      builder: (context) => ReportNameDialog(
        initialName: report.title,
        title: '리포트 이름 변경',
        onSave: (newTitle) async {
          try {
            await ref.read(updateReportProvider((widget.reportId, newTitle)).future);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('리포트 이름이 변경되었습니다')),
              );
            }
          } catch (e) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('변경 실패: $e')),
              );
            }
          }
        },
      ),
    );
  },
  child: Text(
    report.title,
    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
          decoration: TextDecoration.underline,
          decorationColor: Colors.grey,
        ),
  ),
)
```

- [ ] **Step 3: Verify the integration**

Check that:
- Title is underlined (visual cue that it's tappable)
- Tap opens dialog with current title pre-filled
- Dialog title shows "리포트 이름 변경"
- `onSave` calls `updateReportProvider` with `(reportId, newTitle)`
- Success message shows "리포트 이름이 변경되었습니다"
- Error shows snackbar with error message
- UI updates immediately after successful save (due to provider invalidation)

---

## Task 8: Frontend - Widget Tests for ReportNameDialog

**Files:**
- Create: `flutter_app/test/features/reports/widgets/report_name_dialog_test.dart`

**Context:** Test the dialog widget in isolation.

- [ ] **Step 1: Create the test file**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/features/reports/widgets/report_name_dialog.dart';

void main() {
  group('ReportNameDialog', () => {
    testWidgets('renders with initial name', (WidgetTester tester) async {
      String? savedName;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Initial Title',
                onSave: (name) => savedName = name,
              ),
            ),
          ),
        ),
      );

      // Verify initial name is in TextField
      expect(find.byType(TextField), findsOneWidget);
      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.controller?.text, 'Initial Title');
    });

    testWidgets('calls onSave with trimmed input', (WidgetTester tester) async {
      String? savedName;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Old Name',
                onSave: (name) => savedName = name,
              ),
            ),
          ),
        ),
      );

      // Clear and type new name with spaces
      await tester.enterText(find.byType(TextField), '  New Name  ');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Should be trimmed
      expect(savedName, 'New Name');
    });

    testWidgets('shows error for empty input', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Title',
                onSave: (_) {},
              ),
            ),
          ),
        ),
      );

      // Clear TextField
      await tester.enterText(find.byType(TextField), '');
      await tester.tap(find.byType(ElevatedButton)); // Click Save
      await tester.pump();

      // Should show error
      expect(find.text('이름을 입력해주세요'), findsOneWidget);
    });

    testWidgets('shows error for title > 100 chars', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Title',
                onSave: (_) {},
              ),
            ),
          ),
        ),
      );

      // Type long name
      final longName = 'a' * 101;
      await tester.enterText(find.byType(TextField), longName);
      await tester.tap(find.byType(ElevatedButton)); // Click Save
      await tester.pump();

      // Should show error
      expect(find.text('100자 이하로 입력해주세요'), findsOneWidget);
    });

    testWidgets('closes dialog on cancel', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Title',
                onSave: (_) {},
              ),
            ),
          ),
        ),
      );

      // Find and tap Cancel button
      await tester.tap(find.widgetWithText(TextButton, '취소'));
      await tester.pumpAndSettle();

      // Dialog should be gone
      expect(find.byType(AlertDialog), findsNothing);
    });
  });
}
```

- [ ] **Step 2: Run the tests**

```bash
cd flutter_app
flutter test test/features/reports/widgets/report_name_dialog_test.dart -v
```

Expected: All 5 tests pass.

---

## Task 9: Integration Test - Chat Save with Custom Name

**Files:**
- Modify: `flutter_app/test/features/ai_chat/report_save_test.dart` (or create if doesn't exist)

**Context:** Test the complete flow: generate report → save dialog → custom name → appears in Stats.

- [ ] **Step 1: Add integration test for Chat save with name**

```dart
testWidgets('Chat: Save report with custom name', (WidgetTester tester) async {
  // Setup: Mock API responses
  final mockDio = MockDio();
  
  // Mock report generation
  mockDio.onPost('/api/ai/action').reply(200, {
    'type': 'report',
    'report': {
      'reportType': 'monthly_summary',
      'title': 'AI Generated Title',
      'subtitle': 'February 2026',
      'reportData': [/* ... */],
    },
  });

  // Mock report save with custom name
  mockDio.onPost('/api/reports').reply(200, {
    'success': true,
    'reportId': 123,
  });

  // Build the app with mocked API
  await tester.pumpWidget(
    ProviderContainer(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
      ],
      child: const MyApp(),
    ),
  );

  // Navigate to Chat (assuming this is part of the app)
  await tester.tap(find.byIcon(Icons.chat));
  await tester.pumpAndSettle();

  // Simulate report being displayed
  expect(find.text('AI Generated Title'), findsOneWidget);

  // Tap Save button
  await tester.tap(find.widgetWithText(ElevatedButton, '저장하기'));
  await tester.pumpAndSettle();

  // Dialog should appear with AI title
  expect(find.byType(AlertDialog), findsOneWidget);
  expect(find.text('AI Generated Title'), findsOneWidget);

  // Edit the name
  await tester.enterText(find.byType(TextField), 'My Custom Report Name');
  await tester.tap(find.widgetWithText(ElevatedButton, '저장'));
  await tester.pumpAndSettle();

  // Verify API was called with custom name
  expect(mockDio.postRequests.last.data['title'], 'My Custom Report Name');
  
  // Success message should appear
  expect(find.text('리포트가 저장되었습니다'), findsOneWidget);
});
```

- [ ] **Step 2: Run the test**

```bash
cd flutter_app
flutter test test/features/ai_chat/report_save_test.dart -v
```

Expected: Test passes (or skip if integration test infrastructure not yet set up; this is a guide for what to verify manually).

---

## Task 10: Commit All Changes

**Files:**
- Backend: routes, services, tests
- Frontend: providers, widgets, tests

- [ ] **Step 1: Stage all backend changes**

```bash
cd backend
git add src/routes/reports.ts src/services/reports.ts tests/routes/reports.test.ts
git commit -m "feat: add PATCH endpoint to update report title

- Add updateReportTitle service function with validation (1-100 chars)
- Add PATCH /api/reports/:id endpoint
- Add comprehensive tests for update, validation, and data isolation"
```

- [ ] **Step 2: Stage all frontend changes**

```bash
cd flutter_app
git add \
  lib/features/reports/widgets/report_name_dialog.dart \
  lib/shared/providers/report_provider.dart \
  lib/features/ai_chat/widgets/report_card.dart \
  lib/features/reports/report_detail_page.dart \
  test/features/reports/widgets/report_name_dialog_test.dart

git commit -m "feat: add report naming UI in Chat save and Stats detail

- Create reusable ReportNameDialog widget (validation, error handling)
- Add updateReportProvider for PATCH API calls
- Integrate dialog into Chat report save flow (default: AI title)
- Make report title tappable in ReportDetailPage to edit name
- Add widget tests for ReportNameDialog"
```

- [ ] **Step 3: Verify tests pass**

```bash
cd backend && npm run test
cd ../flutter_app && flutter test
```

Expected: All tests pass.

---

## Plan Summary

**5 Backend Tasks:**
1. Service function `updateReportTitle()`
2. PATCH `/api/reports/:id` endpoint
3. Tests for endpoint (success, validation, data isolation)

**5 Frontend Tasks:**
4. Reusable `ReportNameDialog` widget
5. `updateReportProvider` Riverpod provider
6. Chat save integration (show dialog)
7. Stats detail integration (tappable title)
8. Widget tests for dialog
9. Integration test (Chat save flow)
10. Commit all changes

**Total Effort:** ~2 hours (bite-sized, testable steps with frequent commits)
