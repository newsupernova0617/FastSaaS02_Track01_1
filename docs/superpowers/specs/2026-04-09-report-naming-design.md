---
name: Report Naming Feature Design
description: Allow users to name reports when saving in Chat and rename them in Stats page
type: design
---

# Report Naming Feature Design

**Date**: 2026-04-09
**Scope**: Chat page report saving + Stats page report renaming

## Overview

Enable users to give custom names to financial reports at two points in the workflow:
1. **Chat page**: When saving a generated report, display a dialog to input/confirm the name (default: AI-generated title)
2. **Stats page**: In report detail view, allow editing the report name alongside the existing delete functionality

## Feature Requirements

### 1. Chat Page - Save with Name Input

**Trigger**: User clicks "저장하기" (Save) button on a generated report

**Flow**:
1. Dialog appears with title "리포트 저장"
2. TextField contains AI-generated title (pre-filled)
3. User can edit the name or keep default
4. Buttons: "취소" (Cancel) / "저장" (Save)
5. On save: POST to backend with new title + existing report data
6. Success: Show snackbar, navigate back

**Input Constraints**:
- Min length: 1 character
- Max length: 100 characters
- Trim whitespace

**Error Handling**:
- Empty input: Disable save button or show validation message
- Network error: Show snackbar with retry option

### 2. Stats Page - Report Detail with Edit + Delete

**Location**: ReportDetailPage top section (where title currently displays)

**Current State**:
- Title displays as static text
- Bottom buttons: [삭제] (Delete) / [닫기] (Close) - when `isFromStats = true`
- Bottom button: [저장하기] (Save) - when `isFromStats = false`

**Changes**:
- Title becomes tappable (visual indicator: color change on tap, underline, or small edit icon)
- On title tap: Dialog appears (same style as Chat save dialog)
- Dialog pre-filled with current title
- User edits and saves
- Bottom buttons: Keep existing delete + close behavior

**Dialog Reusability**:
- Can use same `_buildReportNameDialog()` in both Chat and ReportDetail pages
- Or create shared widget: `ReportNameDialog(initialName, onSave)`

### 3. Backend API

**New Endpoint**:
```
PATCH /api/reports/:reportId
Body: { "title": "New Title" }
Response: { "success": true, "reportId": int, "title": string }
```

**Existing Endpoints** (no changes):
- `POST /api/reports` - Save report (already exists, add `title` to payload if not present)
- `DELETE /api/reports/:reportId` - Delete report
- `GET /api/reports/:reportId` - Get report detail

**Database**:
- `reports` table already has `title` column
- Update migration if needed (verify schema in `db/schema.ts`)
- Ensure `userId` filtering on all queries

### 4. Frontend - Flutter Implementation

**Files to Modify**:
1. `flutter_app/lib/features/ai_chat/widgets/report_card.dart` 
   - When "저장하기" button tapped, show name input dialog before saving
   
2. `flutter_app/lib/features/reports/report_detail_page.dart`
   - Make title tappable
   - Add name edit dialog on title tap
   - Add `updateReportProvider` for PATCH request

3. `flutter_app/lib/shared/providers/report_provider.dart`
   - Add `updateReportProvider(reportId, newTitle)`

**Dialog Widget** (reusable):
```dart
class ReportNameDialog extends StatefulWidget {
  final String initialName;
  final Function(String) onSave;
  
  // TextField with validation
  // Min: 1, Max: 100 chars
  // Trim input on save
}
```

**State Management**:
- Use existing `flutter_riverpod` patterns
- `ref.read(updateReportProvider(...).future)` for update

### 5. User Experience Flow

**Chat → Save Report**:
```
1. User views generated report
2. Taps "저장하기" button
3. Dialog: "리포트 저장" with AI title pre-filled
4. User edits or accepts default name
5. Taps "저장" → API POST/PATCH with title
6. Success snackbar, dialog closes, navigate back to chat
```

**Stats → Rename Report**:
```
1. User browses saved reports in Stats tab
2. Taps a report → ReportDetailPage opens
3. User taps the report title at top
4. Dialog: "리포트 이름 변경" with current title pre-filled
5. User edits name
6. Taps "저장" → API PATCH
7. Success snackbar, title updates in UI
8. User can delete (existing button) or close
```

## Data Model Changes

**Report Model** (existing):
```dart
class Report {
  final String reportType;
  final String title;  // ← Already exists, now user-editable
  final String subtitle;
  final List<Map<String, dynamic>> reportData;
  final Map<String, dynamic> params;
}
```

**No schema changes needed** - `title` column exists.

## Error Handling

| Scenario | Action |
|----------|--------|
| Empty name input | Disable save button, show "이름을 입력해주세요" |
| Name too long (>100) | Show validation, truncate or error |
| Network error on save | Show snackbar with retry button |
| Name update succeeds | Update UI title, show "저장되었습니다" snackbar |
| Name update fails | Show error snackbar, keep old title |
| Delete while editing | Confirm before delete |

## Testing

**Unit Tests** (backend):
- `PATCH /api/reports/:id` with valid name → success
- `PATCH /api/reports/:id` with empty name → 400 error
- `PATCH /api/reports/:id` with name >100 chars → 400 error
- Verify userId filtering (no cross-user access)

**Widget Tests** (frontend):
- ReportNameDialog renders with initial value
- TextField validation (empty, length)
- onSave callback fires with trimmed input
- Chat report save flow: dialog → API call
- Stats report edit flow: tappable title → dialog → API update

**Integration Tests**:
- End-to-end: Chat save with custom name → appears in Stats
- End-to-end: Stats rename → title updates immediately

## Success Criteria

✅ User can name a report when saving from Chat (defaults to AI title)
✅ User can rename a saved report from Stats page detail view
✅ Both flows persist to backend and display correctly
✅ No cross-user data leaks (userId validation)
✅ Input validation (empty, length constraints)
✅ Consistent UI dialogs in both flows
