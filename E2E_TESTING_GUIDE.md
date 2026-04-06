# End-to-End (E2E) Testing Guide - Playwright

## Overview

This project implements comprehensive End-to-End tests using Playwright, covering real browser interactions with the actual backend API. Tests are organized in two main suites:

- **Task 9: User Workflows** (6 tests) - Chat interaction, navigation, session persistence
- **Task 10: Report Generation** (4 tests) - Financial analysis, data formatting, multi-query workflows

**Total: 10 E2E tests**

## File Structure

```
project-root/
├── playwright.config.ts                 # Main Playwright configuration
└── e2e/
    ├── fixtures/
    │   ├── auth.ts                     # Authentication fixture
    │   └── index.ts                    # Combined fixtures export
    ├── pages/
    │   ├── ai.page.ts                  # AIPage Page Object Model
    │   └── stats.page.ts               # StatsPage Page Object Model
    └── tests/
        ├── ai-chat.e2e.test.ts         # Task 9: User Workflows (6 tests)
        └── ai-report.e2e.test.ts       # Task 10: Report Generation (4 tests)
```

## Configuration

### playwright.config.ts

Main configuration file with:

- **Browser**: Chromium (Desktop Chrome)
- **Base URL**: http://localhost:5173 (frontend dev server)
- **Test Directory**: ./e2e/tests
- **Timeout**: 30 seconds per test
- **Workers**: 1 (serial execution to avoid conflicts)
- **Retries**: 2 (in CI environment only)
- **Auto WebServer**: Starts frontend and backend automatically

Key features:
- Automatic server startup/reuse
- Screenshot on failure
- Trace recording on first retry
- Network idle waits for async operations

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure Playwright is installed
npm list @playwright/test
```

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests with UI (Debugging)

```bash
npm run test:e2e:ui
```

Opens an interactive UI where you can:
- Watch tests execute in real-time
- Step through individual test actions
- See detailed test logs and network requests
- View screenshots and traces

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

Opens the Playwright Inspector for step-by-step debugging.

### Run Specific Test File

```bash
npx playwright test ai-chat.e2e.test.ts
npx playwright test ai-report.e2e.test.ts
```

### Run Specific Test

```bash
npx playwright test -g "should send user message"
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Tests with Verbose Output

```bash
npx playwright test --reporter=verbose
```

## Test Architecture

### Page Object Model (POM)

Tests use the Page Object Model pattern for maintainability and reusability.

#### AIPage (e2e/pages/ai.page.ts)

Main page object for the AI chat interface.

**Constructor:**
```typescript
const aiPage = new AIPage(page)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `goto()` | Navigate to /ai page |
| `sendMessage(text)` | Send a message and clear input |
| `waitForLoadingIndicator()` | Wait for "AI is thinking" indicator |
| `waitForResponse()` | Wait for assistant response to appear |
| `getMessages()` | Get all visible chat messages as array |
| `getLastMessage()` | Get the last message in chat |
| `waitForReportCard(title)` | Wait for a specific report section |
| `clickViewDetails()` | Click "View Details" button |
| `hasErrorMessage()` | Check if error message is visible |
| `clearError()` | Wait for error to disappear |

**Usage Example:**
```typescript
const aiPage = new AIPage(page)
await aiPage.goto()
await aiPage.sendMessage('Analyze my spending')
await aiPage.waitForLoadingIndicator()
await aiPage.waitForResponse()
const messages = await aiPage.getMessages()
```

#### StatsPage (e2e/pages/stats.page.ts)

Page object for the Stats page.

**Methods:**

| Method | Description |
|--------|-------------|
| `goto(month?)` | Navigate to /stats with optional month param |
| `getMonthDisplay()` | Get current month display text |
| `verifyCategoryExists(category)` | Check if category is visible |
| `getPageTitle()` | Get page title text |

### Fixtures

Tests use Playwright fixtures for setup and cleanup.

#### authenticatedPage

Provides a pre-configured page instance with authentication context.

```typescript
test('example', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/ai')
})
```

#### cleanAIHistory

Fixture for cleaning up chat history before/after tests.

```typescript
test('example', async ({ cleanAIHistory }) => {
  // Chat history cleaned before test
  // Test logic here
  // Chat history cleaned after test
})
```

## Test Descriptions

### Task 9: User Workflows E2E Tests (ai-chat.e2e.test.ts)

#### Test 1: Navigate to AIPage
```
Verifies:
- Page navigation to /ai works
- Header "AI Financial Assistant" is visible
- Chat input and send button are present
```

#### Test 2: Send Message & Receive Response
```
Verifies:
- User message appears immediately (optimistic UI)
- Loading indicator appears
- AI response is generated and displayed
- Chat has both user and assistant messages
```

#### Test 3: Multiple Sequential Messages
```
Verifies:
- First message and response work
- Second message sends and responds
- Chat maintains history of multiple exchanges
- Message count increases appropriately
```

#### Test 4: Display Report with Content
```
Verifies:
- Report content is generated
- Financial data indicators are present
- Spending, analysis, or transaction data shows
- Report sections render correctly
```

#### Test 5: Navigate from Report to Stats
```
Verifies:
- "View Details" button is clickable
- Navigation to /stats works
- URL contains month parameter if applicable
- Stats page loads successfully
```

#### Test 6: Preserve Chat History After Refresh
```
Verifies:
- Chat message is sent and appears
- Page reload doesn't clear history
- Same messages are visible after refresh
- Chat history persists in storage
```

### Task 10: Report Generation E2E Tests (ai-report.e2e.test.ts)

#### Test 1: Generate Report from Message
```
Verifies:
- Message requesting analysis is processed
- AI generates a response with report data
- Financial metrics are included
- Response contains spending/income/analysis keywords
```

#### Test 2: Display Metrics with Currency Formatting
```
Verifies:
- Report includes financial metrics
- Currency symbols (₩ for Korean Won) are present
- Numbers/amounts are formatted correctly
- Categories are properly labeled
```

#### Test 3: Multiple Report Queries
```
Verifies:
- First report query generates response
- Second query generates new response
- Third query generates another response
- All queries are stored in chat history
- Chat contains all query texts
```

#### Test 4: Preserve History with Reports After Navigation
```
Verifies:
- Report is generated and appears
- Navigation to stats page works
- Return to AI page shows report history
- Chat messages are preserved through navigation
```

## Debugging Failed Tests

### Check Screenshots

Failed tests automatically save screenshots to:
```
test-results/
├── ai-chat.e2e.test.ts-1-1-chromium.png
└── ai-report.e2e.test.ts-1-1-chromium.png
```

### Review Traces

Traces are recorded on first retry:
```
trace.zip
```

View with:
```bash
npx playwright show-trace trace.zip
```

### Common Issues

#### Timeout on Network Request
**Cause**: Backend not responding or slow
**Solution**: Increase timeout in test or verify backend is running

#### Element Not Found
**Cause**: Selector changed or element not rendered
**Solution**: Update selector in page object or check component render

#### Message Not Appearing
**Cause**: Chat message not sent or API error
**Solution**: Check browser console for errors, verify API endpoint

#### Page Not Loading
**Cause**: Frontend dev server not running
**Solution**: Verify `npm run dev` in frontend directory works

### Enable Debug Logging

```bash
DEBUG=pw:api npx playwright test
```

### Inspect Element in Real-Time

```bash
npx playwright test --debug
```

This opens the Playwright Inspector where you can:
- Step through each action
- Execute commands in console
- Inspect DOM elements
- View network requests

## Best Practices

### 1. Wait Strategies

Use appropriate wait strategies:

```typescript
// Wait for specific element
await page.locator('text=Success').waitFor()

// Wait for network to settle
await page.waitForLoadState('networkidle')

// Wait for navigation
await page.waitForURL('/stats')

// Custom wait
await page.waitForFunction(() => /* condition */)
```

### 2. Error Handling

Always handle potential failures:

```typescript
try {
  await viewDetailsButton.click()
} catch {
  console.log('View Details not available')
}
```

### 3. Assertions

Use clear, specific assertions:

```typescript
// Good
expect(messages.length).toBeGreaterThan(1)
expect(responseText).toContain('spending')

// Avoid
expect(messages).toBeTruthy()
```

### 4. Test Isolation

Each test should be independent:

```typescript
// Each test clears history before starting
test('example', async ({ authenticatedPage, cleanAIHistory }) => {
  // Can assume clean state
})
```

### 5. Timeouts

Set appropriate timeouts:

```typescript
// Default: 30s (from config)
await page.goto('/ai')

// Override for specific action
await page.locator('button').click({ timeout: 5000 })

// Very long operation
await page.waitForFunction(() => /* */, { timeout: 60000 })
```

## Continuous Integration (CI)

In CI environment (detected via `process.env.CI`):

- Tests run serially (workers: 1)
- Failed tests retry up to 2 times
- Screenshots on failure
- Traces recorded automatically
- HTML report generated

```bash
CI=true npm run test:e2e
```

## Performance Tips

1. **Reuse servers**: Config reuses existing servers to save startup time
2. **Serial execution**: Prevents port conflicts and race conditions
3. **Efficient selectors**: Use data-testid or aria-label when possible
4. **Minimal waits**: Use waitForLoadState('networkidle') instead of fixed delays
5. **Parallel independent tests**: Can modify workers if tests don't share state

## Integration with CI/CD

Add to GitHub Actions:

```yaml
- name: Run E2E tests
  run: npm run test:e2e
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Maintenance

### Update Selectors

When UI components change, update selectors in page objects:

```typescript
// e2e/pages/ai.page.ts
this.messageInput = page.locator('textarea[placeholder*="new placeholder"]')
```

### Add New Tests

Create new test file or add to existing:

```typescript
test('new feature', async ({ authenticatedPage }) => {
  // New test logic
})
```

### Refactor Common Patterns

Extract repeated patterns into helper methods:

```typescript
// In AIPage
async sendAndWaitForResponse(message: string) {
  await this.sendMessage(message)
  await this.waitForLoadingIndicator()
  await this.waitForResponse()
}
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-page)
- [Test Configuration](https://playwright.dev/docs/test-configuration)

## Contact & Support

For issues or questions about E2E tests:
1. Check the test output and screenshots
2. Run with `--debug` flag for interactive debugging
3. Review test code in e2e/tests/
4. Check page object methods in e2e/pages/
