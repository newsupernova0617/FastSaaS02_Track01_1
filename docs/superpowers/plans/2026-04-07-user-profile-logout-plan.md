# User Profile & Logout + RecordPage Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user profile modal with logout button accessible from the top-right header, and fix the RecordPage expense/income button vertical-to-horizontal snap issue.

**Architecture:** 
- Create two new components (`UserProfileButton` and `UserProfileModal`) for the profile UI
- Add header wrapper to App.tsx to hold the user profile button in top-right
- Fix RecordPage button container by adding explicit `flex-row` class
- Use AuthContext to pull user data and handle logout

**Tech Stack:** React, TypeScript, Tailwind CSS, React Router, AuthContext (Supabase)

---

## File Structure

**New files:**
- `frontend/src/components/UserProfileButton.tsx` — Avatar icon trigger for the modal
- `frontend/src/components/UserProfileModal.tsx` — Sheet/modal displaying user info and logout
- `frontend/src/components/AppHeader.tsx` — Header wrapper containing the user profile button

**Modified files:**
- `frontend/src/App.tsx` — Add AppHeader component and integrate it into the layout
- `frontend/src/pages/RecordPage.tsx` — Fix button container flex classes

---

## Task 1: Create UserProfileModal Component

**Files:**
- Create: `frontend/src/components/UserProfileModal.tsx`

- [ ] **Step 1: Create the UserProfileModal component file**

Create `frontend/src/components/UserProfileModal.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { LogOut, X } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { session, signOut } = useAuth();
  
  if (!isOpen) return null;

  const user = session?.user;
  const name = user?.user_metadata?.name || user?.email || 'User';
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      
      {/* Modal sheet - bottom aligned */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-lg z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Header with close button */}
        <div className="flex justify-end p-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center space-y-4">
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-16 h-16 rounded-full border-2 border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name */}
          <h2 className="text-xl font-bold text-gray-800">{name}</h2>

          {/* Email */}
          {email && (
            <p className="text-sm text-gray-500">{email}</p>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full mt-6 py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors active:scale-95"
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>

        {/* Bottom padding for mobile safety */}
        <div className="h-6" />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify the component exports correctly**

Check that the file is saved and has no syntax errors by looking at it:

```bash
cat frontend/src/components/UserProfileModal.tsx | head -20
```

Expected: File begins with import statements and component function.

---

## Task 2: Create UserProfileButton Component

**Files:**
- Create: `frontend/src/components/UserProfileButton.tsx`

- [ ] **Step 1: Create the UserProfileButton component file**

Create `frontend/src/components/UserProfileButton.tsx`:

```typescript
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserProfileModal from './UserProfileModal';

export default function UserProfileButton() {
  const { session } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!session) return null;

  const user = session.user;
  const avatarUrl = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.name || user?.email || 'User';

  return (
    <>
      {/* Avatar button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-300 transition-colors active:scale-95"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-gray-600">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {/* Modal */}
      <UserProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Verify the component exports correctly**

```bash
cat frontend/src/components/UserProfileButton.tsx | head -20
```

Expected: File begins with imports and component function.

---

## Task 3: Create AppHeader Component

**Files:**
- Create: `frontend/src/components/AppHeader.tsx`

- [ ] **Step 1: Create the AppHeader component file**

Create `frontend/src/components/AppHeader.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import UserProfileButton from './UserProfileButton';

export default function AppHeader() {
  const { session, loading } = useAuth();
  
  // Only show header when user is logged in
  if (loading || !session) return null;

  return (
    <header className="fixed top-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-b border-gray-100 z-40">
      <div className="flex justify-end items-center px-4 py-3">
        <UserProfileButton />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify the component exports correctly**

```bash
cat frontend/src/components/AppHeader.tsx | head -15
```

Expected: File begins with imports and component function.

---

## Task 4: Integrate AppHeader into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add AppHeader import**

In `frontend/src/App.tsx`, add the import at the top with other component imports (around line 4):

```typescript
import AppHeader from './components/AppHeader';
```

Full imports section should look like:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import RecordPage from './pages/RecordPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';
import AIPage from './pages/AIPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
```

- [ ] **Step 2: Update the main layout div to add top padding**

Modify the div on line 27 (the one with `max-w-[480px]...`) to add top padding for the fixed header:

Change from:
```typescript
<div className={`max-w-[480px] mx-auto min-h-[100dvh] flex flex-col bg-[#f8f8fc] ${showNav ? 'pb-[100px]' : ''}`}>
```

To:
```typescript
<div className={`max-w-[480px] mx-auto min-h-[100dvh] flex flex-col bg-[#f8f8fc] ${showNav ? 'pb-[100px] pt-[60px]' : ''}`}>
```

- [ ] **Step 3: Add AppHeader component to the JSX**

Before the `<main>` element (line 28), add the AppHeader:

```typescript
<AppHeader />
<main className="flex-1 overflow-y-auto">
```

Full updated `AppRoutes` function should look like:

```typescript
function AppRoutes() {
  const { session, loading } = useAuth();
  // 로그인되었을 때만 하단 네비게이션 표시
  const showNav = !loading && !!session;

  return (
    <BrowserRouter>
      <div className={`max-w-[480px] mx-auto min-h-[100dvh] flex flex-col bg-[#f8f8fc] ${showNav ? 'pb-[100px] pt-[60px]' : ''}`}>
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* 루트(/)에 접근하면 /record로 리다이렉트 */}
            <Route path="/" element={<Navigate to="/record" replace />} />
            {/* 로그인 필요한 페이지들 */}
            <Route path="/record" element={<ProtectedRoute><RecordPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
            <Route path="/ai" element={<ProtectedRoute><AIPage /></ProtectedRoute>} />
          </Routes>
        </main>
        {showNav && <BottomNav />}
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Verify the changes**

```bash
cat frontend/src/App.tsx | grep -A 2 "AppHeader"
```

Expected: Should see `import AppHeader` and `<AppHeader />` in the output.

---

## Task 5: Fix RecordPage Button Layout

**Files:**
- Modify: `frontend/src/pages/RecordPage.tsx:47-62`

- [ ] **Step 1: Update the button container with explicit flex-row**

In `frontend/src/pages/RecordPage.tsx`, find the button container around line 47. It currently looks like:

```jsx
<div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
```

Change it to explicitly include `flex-row`:

```jsx
<div className="flex flex-row gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
```

The full container block should now look like:

```jsx
{/* 지출/수입 선택 탭 */}
<div className="flex flex-row gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
  <button
    onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}
    className={`flex-1 py-2 rounded-md font-medium transition-all ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-gray-500'
      }`}
  >
    지출
  </button>
  <button
    onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}
    className={`flex-1 py-2 rounded-md font-medium transition-all ${type === 'income' ? 'bg-white shadow text-blue-500' : 'text-gray-500'
      }`}
  >
    수입
  </button>
</div>
```

- [ ] **Step 2: Verify the change**

```bash
grep -A 20 "지출/수입 선택 탭" frontend/src/pages/RecordPage.tsx | head -25
```

Expected: Should see `flex flex-row` in the div className.

---

## Task 6: Test the changes in browser

**Files:**
- Test: Browser testing (no file changes)

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

Expected: Server starts on http://localhost:5173 (or similar port shown in output)

- [ ] **Step 2: Test user profile button visibility**

- Navigate to any page after login
- Look for the user avatar in the top-right corner of the header
- Avatar should be visible and clickable
- Click it to open the profile modal

- [ ] **Step 3: Test profile modal content**

- Modal should show:
  - User avatar (larger, centered)
  - User name prominently displayed
  - User email below name
  - Red "로그아웃" logout button
- Modal should have an X button to close
- Click outside the modal to close it (backdrop click)

- [ ] **Step 4: Test logout functionality**

- Click the logout button
- You should be redirected to the login page
- Session should be cleared (check browser DevTools > Application > Cookies if needed)

- [ ] **Step 5: Test RecordPage button layout on page load**

- Navigate to /record (or click "기록" in bottom nav)
- The expense/income toggle buttons should render horizontally immediately
- No vertical-to-horizontal snap/shift should occur
- Refresh the page multiple times to verify consistent behavior

- [ ] **Step 6: Test RecordPage button layout on return**

- Go to /record page
- Click to another page (e.g., /stats)
- Navigate back to /record
- Buttons should render horizontally immediately (no snap)

- [ ] **Step 7: Stop the dev server**

```bash
# Press Ctrl+C in the terminal
```

---

## Task 7: Commit all changes

**Files:**
- Modified: `frontend/src/App.tsx`
- Modified: `frontend/src/pages/RecordPage.tsx`
- Created: `frontend/src/components/UserProfileButton.tsx`
- Created: `frontend/src/components/UserProfileModal.tsx`
- Created: `frontend/src/components/AppHeader.tsx`

- [ ] **Step 1: Check git status**

```bash
git status
```

Expected: Shows the 5 files listed above (3 new, 2 modified)

- [ ] **Step 2: Stage all changes**

```bash
git add frontend/src/App.tsx frontend/src/pages/RecordPage.tsx frontend/src/components/UserProfileButton.tsx frontend/src/components/UserProfileModal.tsx frontend/src/components/AppHeader.tsx
```

- [ ] **Step 3: Create the commit**

```bash
git commit -m "feat: add user profile modal and logout button, fix recordpage layout

- Create UserProfileButton and UserProfileModal components
- Add AppHeader to display user profile in top-right corner
- User profile shows name, email, and avatar from Supabase session
- Add logout button in profile modal for sign out
- Fix RecordPage expense/income toggle button layout snap issue by adding explicit flex-row class

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Verify the commit**

```bash
git log --oneline -1
```

Expected: Shows the new commit message above

---

## Summary

This plan implements:

1. ✅ **UserProfileModal** — Displays user info and logout button in a bottom sheet
2. ✅ **UserProfileButton** — Avatar icon trigger that opens the modal
3. ✅ **AppHeader** — Header component housing the user profile button
4. ✅ **App.tsx integration** — Adds header, padding adjustment for layout
5. ✅ **RecordPage layout fix** — Adds `flex-row` class to fix button snap
6. ✅ **Testing** — Verification of all functionality
7. ✅ **Commit** — Final git commit with all changes

**Expected outcome:** User can click their avatar in the top-right, see their profile info, and logout. RecordPage buttons render horizontally immediately with no snap.
