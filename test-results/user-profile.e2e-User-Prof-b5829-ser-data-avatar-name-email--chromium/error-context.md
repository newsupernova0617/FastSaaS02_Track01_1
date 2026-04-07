# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-profile.e2e.test.ts >> User Profile Integration Tests >> 3. Profile modal should display user data (avatar, name, email)
- Location: e2e\tests\user-profile.e2e.test.ts:112:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button').filter({ has: locator('img, span').first() }).first()

```

# Test source

```ts
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
  80  |     await expect(profileButton).toBeVisible();
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
> 118 |     await profileButton.click();
      |                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  181 |     await page.waitForTimeout(300);
  182 | 
  183 |     // Modal should be hidden
  184 |     await expect(backdrop).not.toBeVisible({ timeout: 5000 });
  185 |   });
  186 | 
  187 |   test('6. RecordPage buttons should render horizontally with no snap/shift on load', async ({ page }) => {
  188 |     // Navigate to /record page
  189 |     await page.goto('/record');
  190 |     await page.waitForLoadState('networkidle');
  191 | 
  192 |     // Find the expense/income buttons container
  193 |     const buttonContainer = page.locator('div[class*="flex"][class*="flex-row"]').filter({ has: page.locator('text=지출') }).first();
  194 | 
  195 |     // Container should exist and be visible
  196 |     await expect(buttonContainer).toBeVisible();
  197 | 
  198 |     // Get button positions
  199 |     const expenseBtn = page.locator('button:has-text("지출")').first();
  200 |     const incomeBtn = page.locator('button:has-text("수입")').first();
  201 | 
  202 |     // Both buttons should be visible
  203 |     await expect(expenseBtn).toBeVisible();
  204 |     await expect(incomeBtn).toBeVisible();
  205 | 
  206 |     // Get bounding boxes
  207 |     const expenseBbox = await expenseBtn.boundingBox();
  208 |     const incomeBbox = await incomeBtn.boundingBox();
  209 | 
  210 |     expect(expenseBbox).toBeDefined();
  211 |     expect(incomeBbox).toBeDefined();
  212 | 
  213 |     // Buttons should be on the same Y position (horizontal layout)
  214 |     if (expenseBbox && incomeBbox) {
  215 |       const yDifference = Math.abs(expenseBbox.y - incomeBbox.y);
  216 |       expect(yDifference).toBeLessThan(5); // Should be nearly the same Y position
  217 | 
  218 |       // Expense button should be to the left of income button
```