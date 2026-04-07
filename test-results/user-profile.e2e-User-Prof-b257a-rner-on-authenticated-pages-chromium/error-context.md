# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-profile.e2e.test.ts >> User Profile Integration Tests >> 1. User profile button should be visible in top-right corner on authenticated pages
- Location: e2e\tests\user-profile.e2e.test.ts:69:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button').filter({ has: locator('img, span').first() }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button').filter({ has: locator('img, span').first() }).first()

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Test suite for user profile functionality
  5   |  * Tests:
  6   |  * 1. User profile button visibility in top-right
  7   |  * 2. Profile modal opens/closes correctly
  8   |  * 3. Profile modal displays user data (avatar, name, email)
  9   |  * 4. Logout functionality
  10  |  * 5. RecordPage button layout is horizontal with no snap
  11  |  */
  12  | 
  13  | test.describe('User Profile Integration Tests', () => {
  14  |   // Setup: Mock auth session before each test
  15  |   test.beforeEach(async ({ page, context }) => {
  16  |     // Set up a mock session in localStorage
  17  |     await context.addInitScript(() => {
  18  |       const mockSession = {
  19  |         access_token: 'mock_token_12345',
  20  |         refresh_token: 'mock_refresh_token',
  21  |         expires_in: 3600,
  22  |         expires_at: Math.floor(Date.now() / 1000) + 3600,
  23  |         token_type: 'bearer',
  24  |         type: 'bearer',
  25  |         user: {
  26  |           id: 'test-user-123',
  27  |           aud: 'authenticated',
  28  |           role: 'authenticated',
  29  |           email: 'test@example.com',
  30  |           email_confirmed_at: new Date().toISOString(),
  31  |           phone: '',
  32  |           confirmed_at: new Date().toISOString(),
  33  |           last_sign_in_at: new Date().toISOString(),
  34  |           app_metadata: {
  35  |             provider: 'google',
  36  |             providers: ['google'],
  37  |           },
  38  |           user_metadata: {
  39  |             avatar_url: 'https://lh3.googleusercontent.com/a/default-user-avatar',
  40  |             name: 'Test User',
  41  |             provider: 'google',
  42  |             email_verified: true,
  43  |           },
  44  |           identities: [
  45  |             {
  46  |               id: 'test-user-123',
  47  |               user_id: 'test-user-123',
  48  |               identity_data: {
  49  |                 name: 'Test User',
  50  |                 avatar_url: 'https://lh3.googleusercontent.com/a/default-user-avatar',
  51  |               },
  52  |               provider: 'google',
  53  |               last_sign_in_at: new Date().toISOString(),
  54  |               created_at: new Date().toISOString(),
  55  |               updated_at: new Date().toISOString(),
  56  |             },
  57  |           ],
  58  |           created_at: new Date().toISOString(),
  59  |           updated_at: new Date().toISOString(),
  60  |         },
  61  |       };
  62  | 
  63  |       // Store session in localStorage and sessionStorage
  64  |       localStorage.setItem('sb-cbhrcuktzzvfakwfpqww-auth-token', JSON.stringify(mockSession));
  65  |       sessionStorage.setItem('sb-cbhrcuktzzvfakwfpqww-auth-token', JSON.stringify(mockSession));
  66  |     });
  67  |   });
  68  | 
  69  |   test('1. User profile button should be visible in top-right corner on authenticated pages', async ({ page }) => {
  70  |     // Navigate to /record page (authenticated)
  71  |     await page.goto('/record');
  72  | 
  73  |     // Wait for the page to load and auth context to initialize
  74  |     await page.waitForLoadState('networkidle');
  75  | 
  76  |     // The profile button should be visible in the top-right
  77  |     const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
  78  | 
  79  |     // Check button exists and is visible
> 80  |     await expect(profileButton).toBeVisible();
      |                                 ^ Error: expect(locator).toBeVisible() failed
  81  | 
  82  |     // Check button is positioned in the top area (header)
  83  |     const boundingBox = await profileButton.boundingBox();
  84  |     expect(boundingBox).toBeDefined();
  85  |     if (boundingBox) {
  86  |       expect(boundingBox.y).toBeLessThan(80); // Should be in the top 80px
  87  |     }
  88  | 
  89  |     // Test hover feedback
  90  |     await profileButton.hover();
  91  |     // After hover, button should still be visible
  92  |     await expect(profileButton).toBeVisible();
  93  |   });
  94  | 
  95  |   test('2. Profile modal should open when avatar button is clicked', async ({ page }) => {
  96  |     await page.goto('/record');
  97  |     await page.waitForLoadState('networkidle');
  98  | 
  99  |     // Find and click the profile button
  100 |     const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
  101 |     await profileButton.click();
  102 | 
  103 |     // Modal backdrop should be visible
  104 |     const backdrop = page.locator('[class*="bg-black"], [class*="bg-black/30"]').first();
  105 |     await expect(backdrop).toBeVisible();
  106 | 
  107 |     // Modal sheet should be visible with rounded corners
  108 |     const modalSheet = page.locator('[class*="rounded-t-3xl"], [class*="bottom-0"]').filter({ has: page.locator('text=로그아웃') }).first();
  109 |     await expect(modalSheet).toBeVisible();
  110 |   });
  111 | 
  112 |   test('3. Profile modal should display user data (avatar, name, email)', async ({ page }) => {
  113 |     await page.goto('/record');
  114 |     await page.waitForLoadState('networkidle');
  115 | 
  116 |     // Click profile button to open modal
  117 |     const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
  118 |     await profileButton.click();
  119 | 
  120 |     // Check for avatar in modal
  121 |     const avatarImg = page.locator('[class*="rounded-full"]').filter({ has: page.locator('img') }).first();
  122 |     await expect(avatarImg).toBeVisible();
  123 | 
  124 |     // Check for user name - should be "Test User"
  125 |     await expect(page.locator('text=Test User')).toBeVisible();
  126 | 
  127 |     // Check for email - should be "test@example.com"
  128 |     await expect(page.locator('text=test@example.com')).toBeVisible();
  129 | 
  130 |     // Check for logout button
  131 |     const logoutButton = page.locator('button:has-text("로그아웃")');
  132 |     await expect(logoutButton).toBeVisible();
  133 | 
  134 |     // Check logout button styling (should be red/red-500)
  135 |     const buttonClass = await logoutButton.getAttribute('class');
  136 |     expect(buttonClass).toContain('red');
  137 |   });
  138 | 
  139 |   test('4. Profile modal should close when X button is clicked', async ({ page }) => {
  140 |     await page.goto('/record');
  141 |     await page.waitForLoadState('networkidle');
  142 | 
  143 |     // Open modal
  144 |     const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
  145 |     await profileButton.click();
  146 | 
  147 |     // Modal should be visible
  148 |     const backdrop = page.locator('[class*="bg-black"], [class*="bg-black/30"]').first();
  149 |     await expect(backdrop).toBeVisible();
  150 | 
  151 |     // Find and click X button
  152 |     const closeButton = page.locator('button').filter({ has: page.locator('svg').filter({ hasText: '' }) }).last();
  153 |     await closeButton.click();
  154 | 
  155 |     // Wait a bit for animation
  156 |     await page.waitForTimeout(300);
  157 | 
  158 |     // Modal should be hidden
  159 |     await expect(backdrop).not.toBeVisible({ timeout: 5000 });
  160 |   });
  161 | 
  162 |   test('5. Profile modal should close when backdrop is clicked', async ({ page }) => {
  163 |     await page.goto('/record');
  164 |     await page.waitForLoadState('networkidle');
  165 | 
  166 |     // Open modal
  167 |     const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
  168 |     await profileButton.click();
  169 | 
  170 |     // Modal should be visible
  171 |     const backdrop = page.locator('[class*="bg-black"], [class*="bg-black/30"]').first();
  172 |     await expect(backdrop).toBeVisible();
  173 | 
  174 |     // Click on backdrop
  175 |     const backdropBox = await backdrop.boundingBox();
  176 |     if (backdropBox) {
  177 |       await page.click({ position: { x: backdropBox.x + 10, y: backdropBox.y + 10 } });
  178 |     }
  179 | 
  180 |     // Wait for animation
```