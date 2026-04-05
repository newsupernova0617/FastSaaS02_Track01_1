# Flutter App Testing Guide

**Version:** 1.0  
**Last Updated:** April 5, 2026  

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Running the Backend](#running-the-backend)
3. [Running the Flutter App](#running-the-flutter-app)
4. [Debug Tips](#debug-tips)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Performance Testing](#performance-testing)

---

## Environment Setup

### Prerequisites

**System Requirements:**
- macOS 10.15+, Linux, or Windows with WSL2
- 8GB+ RAM
- 10GB+ disk space

**Required Software:**

1. **Flutter SDK** (v3.x)
   ```bash
   # Check if installed
   flutter --version
   
   # If not installed, download from:
   # https://flutter.dev/docs/get-started/install
   ```

2. **Dart SDK** (included with Flutter, must be ^3.11.4)
   ```bash
   dart --version
   ```

3. **Node.js & npm** (for backend)
   ```bash
   node --version  # v18+ recommended
   npm --version   # v9+ recommended
   ```

4. **Android SDK** (for Android testing)
   OR **Xcode** (for iOS testing)
   OR **Chrome browser** (for web testing)

### Flutter Setup Verification

```bash
# Run doctor to check setup
flutter doctor

# Expected output should show:
# ✓ Flutter (v3.x.x)
# ✓ Dart SDK (v3.11.4+)
# ✓ Android SDK or Xcode
# ✓ VS Code / Android Studio
# ✓ Chrome / connected device
```

### Environment Variables

Create a `.env` file in `flutter_app/` (copy from `.env.example`):

```env
# Backend API Configuration
BACKEND_API_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Optional: AI Service Configuration
# AI_PROVIDER=openai  # or workers-ai
# OPENAI_API_KEY=your_key_here
```

**To get Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Create a project or use existing
3. Go to Project Settings > API
4. Copy SUPABASE_URL and anon key
5. Paste into `.env`

### Dependencies

All Flutter dependencies are declared in `pubspec.yaml`:

```bash
# Install dependencies
cd flutter_app
flutter pub get

# Verify installation
flutter pub deps
```

**Key Dependencies:**
- `flutter_riverpod: ^2.4.0` - State management
- `dio: ^5.3.0` - HTTP client
- `supabase_flutter: ^1.10.0` - Authentication
- `go_router: ^12.0.0` - Navigation
- `fl_chart: ^0.63.0` - Charts
- `table_calendar: ^3.0.0` - Calendar widget
- `freezed_annotation: ^2.4.1` - Data models

---

## Running the Backend

### Backend Server Setup

The backend is a Cloudflare Workers application built with Hono.

**Location:** `/backend`

**Available Endpoints:**
```
GET  /                           - Health check
GET  /api/transactions           - List all transactions
POST /api/transactions           - Create transaction
GET  /api/transactions/:id       - Get transaction details
PUT  /api/transactions/:id       - Update transaction
DELETE /api/transactions/:id     - Delete transaction
GET  /api/users                  - Get user profile
POST /api/ai/chat                - Send chat message to AI
```

### Start Development Server

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Expected output:
# ▲ [wrangler:3.x.x] Your worker is ready at http://localhost:3000
```

**The backend must be running on `http://localhost:3000` for local development.**

### Backend Configuration

Backend environment variables (in `backend/.env` or `wrangler.toml`):

```toml
# Database
TURSO_CONNECTION_URL=...
TURSO_AUTH_TOKEN=...

# Supabase (for auth)
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# AI Services
OPENAI_API_KEY=...
# OR
WORKERS_AI_BINDING=...  # Cloudflare Workers AI
```

**For local development:**
- Uses SQLite (local)
- Supabase for authentication
- Optional: OpenAI or Cloudflare Workers AI for chat

### Verify Backend is Running

```bash
# In a new terminal
curl http://localhost:3000

# Expected: "Hello! FastSaaS Backend is running!"
```

---

## Running the Flutter App

### Option 1: Web (Recommended for Desktop Development)

**Best for:** Development, debugging, quick iteration

```bash
# Navigate to flutter_app
cd flutter_app

# Run on Chrome (requires Chrome to be installed)
flutter run -d chrome

# Or explicitly specify Chrome:
flutter run -d chrome -v  # with verbose logs

# On first run, it will:
# 1. Build the web app
# 2. Launch Chrome
# 3. Show Flutter app with hot reload enabled
```

**Web Development Features:**
- Hot reload (Ctrl+R or Cmd+R)
- Flutter DevTools (Ctrl+Shift+I)
- Chrome DevTools (F12)
- Source maps for debugging Dart code

### Option 2: Android Emulator

**Requirements:** Android SDK, emulator configured

```bash
# List available devices
flutter devices

# Run on Android emulator
flutter run -d emulator-5554

# Or run on specific device
flutter run

# You'll be prompted to select device if multiple available
```

**Android Testing:**
- Full mobile experience
- Can test native Android features
- Foreground service testing
- Physical device testing supported

### Option 3: iOS Simulator

**Requirements:** Xcode (macOS only)

```bash
# List iOS simulators
xcrun simctl list devices

# Run on iOS simulator
flutter run -d iphonesimulator

# Or run on specific simulator
flutter run
```

**iOS Testing:**
- Full mobile experience
- Can test iOS-specific features
- Physical device testing with certificate setup

### Option 4: Physical Device

```bash
# Enable Developer Mode / USB Debugging on device
# Connect device via USB

# List connected devices
flutter devices

# Run on connected device
flutter run

# Or specify device ID
flutter run -d device_id
```

---

## App Usage During Testing

### Navigation After Launch

1. **Login Page** appears first
   - Click "Sign in with Google"
   - Complete Google OAuth flow
   - Redirected to main app after successful auth

2. **Main App** (Dashboard/Home)
   - Bottom navigation with 4-5 tabs
   - Tabs: Record, Calendar, Stats, AI Chat, (Profile)

3. **Test Each Feature:**

   **Record Tab:**
   - Toggle between Expense/Income
   - Select date with date picker
   - Enter amount with comma formatting
   - Select category from grid
   - Add optional memo
   - Submit transaction

   **Calendar Tab:**
   - View current month
   - Dates with transactions highlighted
   - Tap date to see transaction details
   - Navigate previous/next months

   **Stats Tab:**
   - View pie chart of expenses by category
   - Shows total income and expenses
   - Colors represent different categories

   **AI Chat Tab:**
   - Type message asking about finances
   - Send message
   - Wait for AI response
   - View conversation history

---

## Debug Tips

### Enable Verbose Logging

```bash
# Run with verbose logs (shows everything)
flutter run -d chrome -v

# Or just flutter logs
flutter logs -v
```

### Flutter DevTools

```bash
# Open DevTools in browser
flutter pub global run devtools

# Or automatically with run
flutter run -d chrome

# Then open link shown in console
# http://localhost:9100
```

**DevTools Sections:**
- **Inspector** - UI widget tree, inspect elements
- **Profiler** - Performance, frame rendering time
- **Memory** - Memory usage, garbage collection
- **Network** - HTTP requests/responses (if configured)
- **Logging** - App logs and errors
- **Console** - Dart/Flutter diagnostics

### Browser DevTools (Chrome)

For web testing:

```bash
# Press F12 while app running to open Chrome DevTools
# Or Ctrl+Shift+I / Cmd+Option+I
```

**Useful Tabs:**
- **Console** - JavaScript errors, log() output
- **Network** - HTTP requests to backend
- **Application** - Local storage, session storage, cache
- **Elements** - DOM tree (if using Flutter web's DOM)
- **Sources** - Dart source code (with source maps)

### Print Debugging

```dart
// In Dart code
print('Debug message: $value');
debugPrint('Flutter debug: $value');  // Better for long strings
```

Logs appear in Flutter console:

```bash
# In terminal running flutter run
[INFO ] Debug message: value
[INFO ] Flutter debug: value
```

### Network Request Logging

To see API calls:

```dart
// In api_client.dart or api_interceptor.dart
// Dio already logs to console, check:
print('Request: ${response.request}');
print('Response: ${response.data}');
```

Or use Chrome DevTools Network tab:
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Perform action that makes API call
4. See request/response details

### Common Debug Output

```
# No errors
[INFO ] App started successfully

# API connectivity
[INFO ] API Response: 200 OK

# Authentication
[INFO ] User authenticated: user_id=abc123

# Errors to look for
[ERROR] Failed to load transactions: 401 Unauthorized
[ERROR] Network error: No internet connection
[ERROR] JSON serialization error: ...
```

---

## Common Issues & Solutions

### Issue 1: "Flutter SDK not found"

**Error Message:**
```
flutter: command not found
```

**Solution:**
```bash
# Add Flutter to PATH
export PATH="/path/to/flutter/bin:$PATH"

# Verify installation
flutter doctor

# To make permanent, add to ~/.bashrc or ~/.zshrc:
export PATH="$HOME/flutter/bin:$PATH"
```

### Issue 2: "Chrome not found"

**Error Message:**
```
Unable to locate Chrome application
```

**Solution:**
```bash
# Install Chrome from: https://google.com/chrome

# Or use a different device:
flutter devices  # See available devices
flutter run -d device_name
```

### Issue 3: "Backend not responding"

**Error Message:**
```
Connection refused: localhost:3000
Failed to connect to API
```

**Solution:**
```bash
# Verify backend is running
curl http://localhost:3000

# If not running, start it:
cd backend
npm run dev

# Check backend logs for errors
# Port 3000 might be in use:
lsof -i :3000  # See what's using port 3000
kill -9 <PID>  # Kill the process
npm run dev     # Restart backend
```

### Issue 4: "Supabase authentication fails"

**Error Message:**
```
Failed to initialize Supabase
Invalid credentials
```

**Solution:**
```bash
# Check .env file exists in flutter_app/:
cat flutter_app/.env

# Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
# Get from: https://app.supabase.com > Project > Settings > API

# If .env missing, create from example:
cp flutter_app/.env.example flutter_app/.env
# Edit .env with correct credentials
```

### Issue 5: "Hot reload not working"

**Error Message:**
```
Failed to hot reload application
```

**Solution:**
```bash
# Press 'r' in terminal to do hot reload
# If stuck, press 'q' to quit and restart:
flutter run -d chrome

# Full rebuild if hot reload fails:
flutter run -d chrome --no-fast-start
```

### Issue 6: "Transaction not appearing in calendar"

**Possible Causes:**
- API request failed (check backend logs)
- Transaction provider not updated (check Riverpod state)
- Date mismatch (verify date selection)

**Debug Steps:**
```bash
# 1. Check backend logs for POST /api/transactions
# Look for 200 status code and returned transaction

# 2. Check API response in Chrome DevTools:
# - Open Network tab (F12)
# - Create transaction
# - Look for /api/transactions POST request
# - Check Response tab for transaction data

# 3. Check transaction provider update:
# Add this to record_page.dart temporarily:
print('Transaction created: $transactionData');
print('Provider state: ${ref.watch(transactionProvider)}');

# 4. Verify date selection:
# Print selected date and compare with transaction date
print('Selected date: $_selectedDate');
```

### Issue 7: "AI chat not responding"

**Possible Causes:**
- AI service not configured
- Backend AI endpoint error
- API key invalid

**Debug Steps:**
```bash
# 1. Check backend logs for POST /api/ai/chat
# 2. Verify AI service is configured in backend/.env
# 3. Check Chrome Network tab for AI request:
#    - Request should be POST /api/ai/chat
#    - Check response for error message
# 4. If error, check backend console for details
```

### Issue 8: "Pie chart not rendering"

**Possible Causes:**
- No transaction data
- Data formatting issue
- fl_chart dependency issue

**Debug Steps:**
```bash
# 1. Verify transactions exist in calendar view
# 2. Add debug print in stats_page.dart:
print('Chart data: $chartData');
print('Entries: ${chartData.length}');

# 3. Check browser console for JavaScript errors (F12)
# 4. Try scrolling/resizing chart area
# 5. Verify fl_chart is compatible with Flutter version:
flutter pub outdated
```

---

## Performance Testing

### Startup Time

```bash
# Check app startup time
flutter run -d chrome -v 2>&1 | grep "Startup time"

# Expected: < 5 seconds for web, < 10 seconds for mobile
```

### Frame Rate (Jank Testing)

1. Open Flutter DevTools
2. Go to Profiler tab
3. Perform smooth scrolling/animations
4. Look for frames below 60 FPS (web) or 120 FPS (mobile)
5. If many frames drop, there's a performance issue

### Memory Usage

1. Open Flutter DevTools
2. Go to Memory tab
3. Perform normal app usage
4. Look for memory trends
5. Should stabilize, not continuously grow

### Network Performance

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Set throttling to simulate 4G/3G (if needed)
4. Perform actions and monitor request times
5. Each API call should be < 1 second typically

### Test Checklist

- [ ] App starts in < 5 seconds
- [ ] No frames drop below 50 FPS during normal usage
- [ ] Memory stable (doesn't continuously grow)
- [ ] API calls complete in < 2 seconds
- [ ] No visual jank when scrolling calendar
- [ ] Charts render smoothly
- [ ] No excessive CPU usage

---

## Testing Checklist

- [ ] Environment setup complete (Flutter, Node, etc.)
- [ ] .env file created with correct credentials
- [ ] Backend server running on localhost:3000
- [ ] Flutter app starts without errors
- [ ] Login works with Google OAuth
- [ ] Can add expense transaction
- [ ] Can add income transaction
- [ ] Calendar displays transactions
- [ ] Stats pie chart renders correctly
- [ ] AI chat sends and receives messages
- [ ] Bottom navigation works
- [ ] Logout functionality works
- [ ] Error handling shows for network failures
- [ ] No critical errors in console logs

---

## Next Steps for Production

1. **Build for release:**
   ```bash
   flutter build web  # Web
   flutter build apk  # Android
   flutter build ios  # iOS
   ```

2. **Performance optimization:**
   - Profile with DevTools
   - Optimize images and assets
   - Lazy load pages
   - Cache API responses

3. **Security hardening:**
   - Secure storage for auth tokens
   - HTTPS only for API calls
   - Input validation and sanitization
   - No sensitive data in logs

4. **Deployment:**
   - Deploy web to Cloudflare Pages or Vercel
   - Upload APK to Google Play Store
   - Deploy iOS to Apple App Store

---

## Support & Resources

**Flutter Documentation:**
- https://flutter.dev/docs
- https://dart.dev/guides

**Plugin Documentation:**
- https://pub.dev (search for package name)
- Each package has README with examples

**Community Help:**
- Stack Overflow: Tag `flutter`
- Flutter Discord: https://discord.gg/flutter
- GitHub Issues: https://github.com/flutter/flutter/issues

**Testing Resources:**
- Flutter Testing: https://flutter.dev/docs/testing
- Integration Tests: https://flutter.dev/docs/testing/integration-tests
- Driver Tests: https://flutter.dev/docs/testing/driver-tests

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-05 | Initial testing guide |

---

**Last Updated:** 2026-04-05  
**Created For:** Flutter Migration Task 14  
**Status:** Ready for Testing
