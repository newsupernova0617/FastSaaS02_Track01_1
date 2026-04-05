# Flutter Integration Test Checklist

**Date:** April 5, 2026  
**Version:** 1.0  
**Status:** Ready for Testing  

## Pre-Flight Checklist

Before starting integration tests, verify the following prerequisites:

- [ ] Flutter SDK installed and in PATH
- [ ] Dart SDK version ^3.11.4
- [ ] Android SDK/emulator available OR iOS simulator available OR Chrome for web
- [ ] Backend server running (npm run dev from backend/)
- [ ] Supabase project configured with correct credentials in .env
- [ ] Backend URL correctly set in flutter_app/.env
- [ ] All dependencies installed (flutter pub get)
- [ ] No build errors (flutter doctor shows no critical issues)
- [ ] Emulator/device has internet connectivity

## Environment Setup Verification

### Local Environment Variables
```
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
BACKEND_API_URL=http://localhost:3000  (for web) or appropriate IP for mobile
```

### Backend Services Running
```bash
cd backend/
npm install
npm run dev
# Expected: Server running on http://localhost:3000
```

### Available Backend Endpoints
- `GET /` - Health check
- `POST /api/ai/chat` - AI chat endpoint
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/users` - Get user profile
- `POST /api/users` - Create/update user profile

## Feature Testing Procedures

### 1. Authentication & Login

**Feature:** Google OAuth login flow  
**Expected Behavior:** User can login via Google, receive JWT token, and access app

#### Test Steps
1. Launch app: `flutter run -d chrome` (web) or appropriate device
2. Observe login page with "Sign in with Google" button
3. Click "Sign in with Google" button
4. Complete Google authentication flow in browser
5. Verify redirect back to app after login
6. Check that user is authenticated (token stored)
7. Verify navigation to main app (home/dashboard)

#### Expected Results
- [ ] Login page displays correctly with Google sign-in button
- [ ] Google OAuth popup/redirect works
- [ ] User successfully authenticated
- [ ] JWT token stored in secure storage/Supabase session
- [ ] User redirected to dashboard/home page
- [ ] No authentication errors in console

#### Troubleshooting
- **Google sign-in button doesn't work:** Check Supabase Google provider configuration
- **Redirect fails:** Verify OAuth redirect URL in Supabase and google_sign_in configuration
- **Token not persisted:** Check Supabase session storage implementation
- **Can't authenticate:** Verify internet connectivity and Supabase credentials

---

### 2. Record Transaction - Expense

**Feature:** Add expense transaction with category and memo  
**Expected Behavior:** User can create expense transaction with amount, category, date, and memo

#### Test Steps
1. From dashboard/home, navigate to "Record" or "Add Transaction" page
2. Verify transaction type is set to "Expense" (should be default)
3. Verify today's date is pre-selected
4. Enter amount: `5000` (or test with various formats: 5,000 / 5.00)
5. Select a category (e.g., "Food", "Transport", "Shopping")
6. Enter memo: `Lunch at restaurant`
7. Tap submit/save button
8. Observe loading state during submission
9. Verify success feedback (snackbar/toast message)
10. Navigate to calendar or stats to verify transaction appears

#### Expected Results
- [ ] Record page loads correctly
- [ ] Amount field accepts numeric input with formatting
- [ ] Categories display in grid (3 columns)
- [ ] Category selection works visually
- [ ] Memo field accepts text input
- [ ] Submit button is enabled when amount and category are provided
- [ ] Loading state shows during submission
- [ ] Success snackbar appears after submission
- [ ] Transaction appears in calendar/stats
- [ ] Amount is correctly formatted in backend storage

#### Test Variations
- Test with different amounts: 1, 999999, 5.5, 5.50
- Test with all available expense categories
- Test with/without memo
- Test with different dates using date picker
- Test form validation (empty amount should disable submit)

#### Troubleshooting
- **Amount formatting issues:** Check number parsing logic in record_page.dart
- **Category not saving:** Verify categories.dart has all categories, check API transmission
- **Submit fails silently:** Check browser console and backend logs for API errors
- **Transaction not appearing in calendar:** Check transaction provider updates, verify calendar data refresh

---

### 3. Record Transaction - Income

**Feature:** Add income transaction  
**Expected Behavior:** User can switch to income type and create income transaction

#### Test Steps
1. Go to Record page
2. Tap/toggle transaction type to "Income"
3. Enter amount: `50000`
4. Select income category (e.g., "Salary", "Bonus", "Investment")
5. Enter memo: `Monthly salary`
6. Tap submit
7. Verify success message
8. Navigate to stats to verify income is recorded separately

#### Expected Results
- [ ] Transaction type toggle works correctly
- [ ] Income categories display correctly
- [ ] Income amount is submitted successfully
- [ ] Income appears separately from expenses in stats/calendar
- [ ] Income total is correctly calculated

#### Troubleshooting
- **Categories don't switch:** Check `_getCategories()` method in record_page.dart
- **Income not separated from expense:** Check transaction type handling in stats page and provider

---

### 4. Calendar View

**Feature:** View transactions on calendar by date  
**Expected Behavior:** Calendar displays dates with transactions, clicking shows details

#### Test Steps
1. Navigate to Calendar page from bottom navigation
2. Observe current month calendar displayed
3. Look for dates with transactions highlighted (visual indicator)
4. Tap on a date that has a transaction
5. Verify transaction details display (amount, category, type, memo)
6. Tap previous/next month arrows to navigate
7. Verify calendar updates correctly for different months
8. Add a new transaction and verify calendar updates

#### Expected Results
- [ ] Calendar displays current month correctly
- [ ] Dates with transactions are visually distinct
- [ ] Tapping a date shows transaction details
- [ ] Month navigation works (previous/next)
- [ ] Calendar updates after adding new transaction
- [ ] Transaction amounts are visible/accessible

#### Troubleshooting
- **Calendar not loading:** Check table_calendar configuration and transaction provider
- **No transactions visible:** Verify transaction API returns data, check provider state updates
- **Month navigation broken:** Check GoRouter navigation or month change handlers
- **Performance issues on calendars with many transactions:** Consider pagination in future versions

---

### 5. Statistics/Charts

**Feature:** View transaction statistics as pie chart  
**Expected Behavior:** Pie chart displays expense breakdown by category, income shown separately

#### Test Steps
1. Navigate to Stats page from bottom navigation
2. Observe pie chart rendering (should show categories with colors)
3. Look for legend showing category names and amounts
4. Verify total income and total expense displayed
5. Check that percentages are correct (e.g., if Food=3000/6000 total, should show 50%)
6. Add a new expense/income and refresh stats
7. Verify pie chart updates with new data
8. Look for any NaN/infinity values or rendering errors

#### Expected Results
- [ ] Pie chart displays without errors
- [ ] All categories with transactions appear in chart
- [ ] Colors are distinct for each category
- [ ] Legend shows category names and amounts
- [ ] Percentages sum to 100% (approximately)
- [ ] Total income/expense displayed correctly
- [ ] Chart updates after adding transactions
- [ ] No visual artifacts or rendering glitches
- [ ] Chart is responsive to screen size

#### Data Validation
- Verify pie chart percentages match manual calculation
- Verify chart color assignment is consistent
- Check that empty categories are not shown
- Verify correct handling of zero transactions

#### Troubleshooting
- **Pie chart not rendering:** Check fl_chart dependency and StatsPage implementation
- **Data values incorrect:** Verify transaction_provider correctly sums/groups by category
- **Chart doesn't update:** Check Riverpod state management, verify transactions provider refresh
- **Performance lag:** Check if chart has too much data, consider optimization

---

### 6. AI Chat Feature

**Feature:** Send message to AI and receive response  
**Expected Behavior:** User can chat with AI assistant, messages display correctly, AI responds

#### Test Steps
1. Navigate to AI Chat page from bottom navigation
2. Observe chat interface (message list, input field, send button)
3. Tap input field and type message: `How much did I spend on food this month?`
4. Tap send button
5. Observe message appears in chat (user message bubble, timestamp)
6. Wait for AI response (should see loading indicator)
7. Verify AI response appears in chat (AI message bubble, different styling)
8. Send multiple messages and verify conversation history displays
9. Test with different question types (summary, advice, categorization)
10. Verify old messages persist (scroll up to see history)

#### Expected Results
- [ ] Chat page loads with empty chat initially
- [ ] User message appears in chat after sending
- [ ] User messages have distinct styling (right-aligned, different color)
- [ ] AI message appears after processing
- [ ] AI messages have distinct styling (left-aligned, different color)
- [ ] Loading indicator shows while AI processes
- [ ] Timestamps display for each message
- [ ] Chat history persists in conversation
- [ ] Input field clears after sending
- [ ] Send button is disabled while loading

#### AI Response Testing
- [ ] AI correctly interprets user questions
- [ ] AI provides relevant financial advice/analysis
- [ ] AI response is grammatically correct
- [ ] Response time is reasonable (< 10 seconds typically)
- [ ] AI can handle multiple follow-up questions

#### Example Test Cases
- "How much did I spend on food?" - Should sum food category expenses
- "What was my biggest expense?" - Should identify max transaction
- "Summarize my spending" - Should give overview
- "How much did I save?" - Should show (income - expenses)

#### Troubleshooting
- **AI doesn't respond:** Check backend /api/ai/chat endpoint, verify backend is running
- **Chat doesn't send:** Check API client, verify authentication token is sent
- **Message doesn't display:** Check chat UI state management, verify message model serialization
- **Loading indicator stuck:** Check timeout settings, verify AI service response
- **Slow responses:** Check AI service (OpenAI/Workers AI) backend configuration

---

### 7. Bottom Navigation

**Feature:** Navigate between all app pages via bottom navigation  
**Expected Behavior:** Bottom nav bar displays all page tabs, tapping switches pages

#### Test Steps
1. Observe bottom navigation bar (should have 4-5 tabs)
2. Verify current tab is highlighted/active
3. Tap "Record" tab
4. Verify Record page displays
5. Tap "Calendar" tab
6. Verify Calendar page displays and retains data from previous view
7. Tap "Stats" tab
8. Verify Stats page displays
9. Tap "AI Chat" tab
10. Verify AI Chat page displays with message history intact
11. Tap "Profile" or equivalent tab (if exists)
12. Verify navigation completes without lag
13. Use back button - verify it doesn't break navigation

#### Expected Results
- [ ] All navigation tabs are visible
- [ ] Tapping tab switches to correct page
- [ ] Active tab is visually highlighted
- [ ] Page state is preserved when switching away and back
- [ ] Navigation is smooth without jank
- [ ] All pages are accessible via bottom nav
- [ ] No broken routes or error pages

#### Troubleshooting
- **Tab not responding:** Check GoRouter navigation config and bottom_nav_shell
- **Wrong page displays:** Verify route definitions in app_router.dart
- **State lost on navigation:** Check Riverpod state management, use KeepAlive
- **Performance issues:** Check for excessive rebuilds with Flutter DevTools

---

### 8. Logout & Session Management

**Feature:** User can logout and return to login page  
**Expected Behavior:** Logout clears session, removes auth token, redirects to login

#### Test Steps
1. While logged in, look for logout button/option (may be in settings/profile)
2. Tap logout button
3. Observe loading state during logout
4. Verify redirect to login page
5. Verify previous user data is not visible
6. Attempt to access protected route without logging in
7. Verify app redirects to login
8. Re-authenticate and verify access to app is restored

#### Expected Results
- [ ] Logout button is accessible from app
- [ ] Session data is cleared
- [ ] Auth token is removed from storage
- [ ] User redirected to login page
- [ ] Protected routes are inaccessible without auth
- [ ] Logging in again works correctly
- [ ] New session data is loaded correctly
- [ ] No sensitive data remains in cache after logout

#### Security Checks
- [ ] Local storage/SharedPreferences cleared on logout
- [ ] Session token removed from memory
- [ ] API requests fail without valid token
- [ ] Login page appears on app restart after logout

#### Troubleshooting
- **Logout button missing:** Check if profile/settings page exists, may need to add logout UI
- **Still logged in after logout:** Check auth provider, verify SharedPreferences clear
- **Can access protected routes:** Check middleware authentication, verify JWT validation

---

### 9. Error Handling - Network Errors

**Feature:** App handles network errors gracefully  
**Expected Behavior:** Network failures show user-friendly error messages

#### Test Steps
1. Open app and start using features
2. Simulate network disconnection (disconnect WiFi/mobile data)
3. Try to add a transaction
4. Observe error message (should be snackbar/dialog)
5. Verify error message is user-friendly (not raw exception)
6. Re-enable network
7. Try action again
8. Verify it succeeds
9. Simulate poor network (throttle connection)
10. Try to add transaction
11. Verify app handles timeout gracefully

#### Expected Results
- [ ] Network error shows snackbar/dialog
- [ ] Error message is clear and actionable
- [ ] Error message includes suggestion to retry
- [ ] App doesn't crash or become unresponsive
- [ ] Retry button works and retries the action
- [ ] After network restored, app works normally
- [ ] Timeout errors handled gracefully
- [ ] User can continue using other features during network issues

#### Error Scenarios to Test
- [ ] Complete network disconnection
- [ ] Timeout (no response from server)
- [ ] Server error (500)
- [ ] Authentication error (401)
- [ ] Bad request error (400)

#### Troubleshooting
- **Raw exception messages shown:** Check error handling in API client/Dio interceptor
- **App crashes on network error:** Check try-catch blocks in transaction provider
- **No error feedback:** Check snackbar/dialog implementation in pages
- **Retry doesn't work:** Check retry logic in transaction submission

---

### 10. Dark Mode (if applicable)

**Feature:** App supports dark mode  
**Expected Behavior:** UI colors adapt to dark mode theme

#### Test Steps
1. Enable dark mode in device settings (or app settings if implemented)
2. Verify all pages display correctly in dark mode
3. Check text contrast is sufficient (readable)
4. Verify no white text on white background issues
5. Check that charts/visualizations are visible in dark mode
6. Test switching between light and dark mode
7. Verify app state is preserved on theme switch
8. Check colors in pie chart are visible on dark background

#### Expected Results
- [ ] Dark theme applies to all pages
- [ ] Text is readable in dark mode
- [ ] Background colors are dark
- [ ] Buttons and interactive elements are visible
- [ ] Charts/visualizations maintain visibility
- [ ] Theme switching is smooth
- [ ] App state preserved on theme change
- [ ] No flashing or visual artifacts

#### Accessibility Checks
- [ ] Text contrast meets WCAG standards
- [ ] Colors not only way to distinguish elements
- [ ] Icons visible in both light and dark modes

#### Troubleshooting
- **Dark mode not working:** Check AppTheme.darkTheme implementation
- **Text not readable:** Adjust text colors in theme
- **Charts invisible:** Check fl_chart dark mode support

---

## Comprehensive Test Scenarios

### Scenario 1: Full Transaction Workflow
1. Login with Google OAuth
2. Add 3 expense transactions (Food=5000, Transport=3000, Shopping=2000)
3. Add 1 income transaction (Salary=50000)
4. View transactions on calendar
5. Check stats show correct pie chart (75% food, 45% transport, 30% shopping)
6. Send AI message: "How much did I spend?"
7. Logout
8. Re-login and verify data persists

### Scenario 2: Error Recovery
1. Login
2. Disconnect network
3. Try to add transaction
4. Verify error message
5. Enable network
6. Retry transaction
7. Verify success

### Scenario 3: Data Validation
1. Try to submit empty transaction (should fail)
2. Try negative amount (should handle gracefully)
3. Try very large amount (should validate)
4. Try without category (should require category)
5. Submit with all fields and verify success

## Known Limitations & TODOs

- [ ] Offline mode not yet implemented (transactions require network)
- [ ] Image receipt capture not yet implemented
- [ ] Voice input not yet implemented
- [ ] Data export/backup not yet implemented
- [ ] Recurring transactions not yet implemented
- [ ] Budget tracking not yet implemented
- [ ] Notifications not yet implemented
- [ ] Widget shortcuts not yet implemented

## Test Results Documentation

### Test Date: _________
**Tester Name:** _________
**Device/Platform:** _________

#### Feature Testing Summary
| Feature | Status | Issues | Notes |
|---------|--------|--------|-------|
| Google OAuth Login | PASS/FAIL | | |
| Add Expense Transaction | PASS/FAIL | | |
| Add Income Transaction | PASS/FAIL | | |
| Calendar View | PASS/FAIL | | |
| Stats Pie Chart | PASS/FAIL | | |
| AI Chat | PASS/FAIL | | |
| Bottom Navigation | PASS/FAIL | | |
| Logout | PASS/FAIL | | |
| Error Handling | PASS/FAIL | | |
| Dark Mode | PASS/FAIL | | |

#### Issues Found
```
[Issue #1]
- Description: 
- Steps to Reproduce:
- Expected:
- Actual:
- Severity: Critical/High/Medium/Low

[Issue #2]
...
```

#### Performance Notes
- App startup time: _____ ms
- Transaction submission time: _____ ms
- Calendar rendering time: _____ ms
- Chart rendering time: _____ ms

#### Device Information
- OS: iOS / Android / Web
- OS Version: _________
- Device Model: _________
- App Version: 1.0.0

---

## Sign-Off

- [ ] All critical tests passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready for production

**Tester Signature:** _________  
**Date:** _________  
**Approved by:** _________  

---

## Appendix: Quick Reference

### Keyboard Shortcuts (Web)
- `Ctrl+Shift+I` - Open DevTools
- `F12` - Toggle DevTools
- `Ctrl+R` - Refresh app

### Useful Commands
```bash
# Run Flutter web app
flutter run -d chrome

# Run with debug logs
flutter run -d chrome -v

# Build web release
flutter build web

# Format code
dart format lib/

# Analyze code
dart analyze
```

### File Locations
- App main: `lib/main.dart`
- Pages: `lib/features/*/`
- Providers: `lib/shared/providers/`
- Models: `lib/shared/models/`
- API Client: `lib/core/api/`
- Theme: `lib/core/theme/`
- Routes: `lib/routes/app_router.dart`

### Common API Responses
```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "error": "Error message",
  "details": { ... }
}
```

## Notes for Future Testing

- Consider implementing automated integration tests with Flutter testing framework
- Record video of test runs for bug reporting
- Use Flutter DevTools for performance profiling
- Monitor network tab for API call details
- Check console for warnings/errors during testing
