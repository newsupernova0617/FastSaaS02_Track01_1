# User Profile & Logout + RecordPage Layout Fix

**Date:** 2026-04-07  
**Status:** Approved  

---

## Overview

Two focused improvements to the expense tracker frontend:

1. **User Profile & Logout UI** — Add a user profile modal accessible from the header
2. **RecordPage Button Layout Fix** — Fix the vertical-to-horizontal snap issue on the expense/income toggle

---

## 1. User Profile & Logout Feature

### Requirement

Add user profile display and logout functionality accessible from a header icon.

### Design

**Location:** Top-right corner of the page header (visible on all pages)

**Trigger:** Click on a circular user avatar icon

**Modal Content:**
- User avatar (larger display, centered)
- User name (displayed prominently below avatar)
- User email (secondary text below name)
- Logout button (full-width, red/destructive styling)

**User Data Sources:**
Display user data from the `User` schema (from AuthContext), specifically:
- `name` — user's display name
- `email` — user's email address
- `avatarUrl` — profile picture URL

Hidden/not displayed:
- `id`, `provider`, `createdAt` (technical/internal)

### Interaction Flow

1. User clicks avatar icon in top-right
2. Bottom sheet modal slides up
3. Modal shows profile info + logout button
4. Logout click → calls `signOut()` from AuthContext → redirects to login page
5. Modal close (click outside, swipe down, or X button) → returns to page

### Implementation Approach

**Components to create:**
1. `UserProfileButton` — Avatar icon trigger (goes in header area of App.tsx or new Header component)
2. `UserProfileModal` — Sheet/modal component displaying user data and logout option

**Styling:**
- Use existing color scheme (gray/white for modal, red for logout button)
- Match existing rounded corners and shadows
- Responsive width (fits mobile 480px constraint)

**Data flow:**
- Pull user data from `useAuth()` hook (session data contains user profile)
- On logout, `useAuth().signOut()` handles sign-out and navigation

---

## 2. RecordPage Button Layout Fix

### Problem

The expense/income toggle buttons on RecordPage render vertically on initial page load or when returning to the page from another route. After a moment, they snap to horizontal layout. This indicates a CSS loading or timing issue.

### Root Cause

The flex layout CSS (from Tailwind classes) is not being applied immediately on render. The buttons default to block/vertical layout until Tailwind's flex utilities are available.

### Solution

Explicitly ensure the parent container has `flex` and `flex-row` applied from the start:

**In RecordPage.tsx, the button container:**
```jsx
<div className="flex flex-row gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
```

Verify:
- `flex` class is present (sets `display: flex`)
- `flex-row` is explicitly set (ensures row direction, not column)
- Both child buttons have `flex-1` to split space equally

If the snap still occurs after this, consider adding an inline style fallback as a safety net, though Tailwind should handle it.

### Expected Result

Buttons render horizontally on first load, no snap/shift.

---

## Implementation Plan

See `docs/superpowers/plans/2026-04-07-user-profile-logout-plan.md` for the detailed step-by-step implementation.
