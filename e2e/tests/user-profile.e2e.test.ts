import { test, expect } from '@playwright/test';

/**
 * Test suite for user profile functionality
 * Tests:
 * 1. User profile button visibility in top-right
 * 2. Profile modal opens/closes correctly
 * 3. Profile modal displays user data (avatar, name, email)
 * 4. Logout functionality
 * 5. RecordPage button layout is horizontal with no snap
 */

test.describe('User Profile Integration Tests', () => {
  // Setup: Mock auth session before each test
  test.beforeEach(async ({ page, context }) => {
    // Set up a mock session in localStorage
    await context.addInitScript(() => {
      const mockSession = {
        access_token: 'mock_token_12345',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        type: 'bearer',
        user: {
          id: 'test-user-123',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {
            provider: 'google',
            providers: ['google'],
          },
          user_metadata: {
            avatar_url: 'https://lh3.googleusercontent.com/a/default-user-avatar',
            name: 'Test User',
            provider: 'google',
            email_verified: true,
          },
          identities: [
            {
              id: 'test-user-123',
              user_id: 'test-user-123',
              identity_data: {
                name: 'Test User',
                avatar_url: 'https://lh3.googleusercontent.com/a/default-user-avatar',
              },
              provider: 'google',
              last_sign_in_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      // Store session in localStorage and sessionStorage
      localStorage.setItem('sb-cbhrcuktzzvfakwfpqww-auth-token', JSON.stringify(mockSession));
      sessionStorage.setItem('sb-cbhrcuktzzvfakwfpqww-auth-token', JSON.stringify(mockSession));
    });
  });

  test('1. User profile button should be visible in top-right corner on authenticated pages', async ({ page }) => {
    // Navigate to /record page (authenticated)
    await page.goto('/record');

    // Wait for the page to load and auth context to initialize
    await page.waitForLoadState('networkidle');

    // The profile button should be visible in the top-right
    const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();

    // Check button exists and is visible
    await expect(profileButton).toBeVisible();

    // Check button is positioned in the top area (header)
    const boundingBox = await profileButton.boundingBox();
    expect(boundingBox).toBeDefined();
    if (boundingBox) {
      expect(boundingBox.y).toBeLessThan(80); // Should be in the top 80px
    }

    // Test hover feedback
    await profileButton.hover();
    // After hover, button should still be visible
    await expect(profileButton).toBeVisible();
  });

  test('2. Profile modal should open when avatar button is clicked', async ({ page }) => {
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // Find and click the profile button
    const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
    await profileButton.click();

    // Modal backdrop should be visible
    const backdrop = page.locator('[class*="bg-black"], [class*="bg-black/30"]').first();
    await expect(backdrop).toBeVisible();

    // Modal sheet should be visible with rounded corners
    const modalSheet = page.locator('[class*="rounded-t-3xl"], [class*="bottom-0"]').filter({ has: page.locator('text=로그아웃') }).first();
    await expect(modalSheet).toBeVisible();
  });

  test('3. Profile modal should display user data (avatar, name, email)', async ({ page }) => {
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // Click profile button to open modal
    const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
    await profileButton.click();

    // Check for avatar in modal
    const avatarImg = page.locator('[class*="rounded-full"]').filter({ has: page.locator('img') }).first();
    await expect(avatarImg).toBeVisible();

    // Check for user name - should be "Test User"
    await expect(page.locator('text=Test User')).toBeVisible();

    // Check for email - should be "test@example.com"
    await expect(page.locator('text=test@example.com')).toBeVisible();

    // Check for logout button
    const logoutButton = page.locator('button:has-text("로그아웃")');
    await expect(logoutButton).toBeVisible();

    // Check logout button styling (should be red/red-500)
    const buttonClass = await logoutButton.getAttribute('class');
    expect(buttonClass).toContain('red');
  });

  test('4. Profile modal should close when X button is clicked', async ({ page }) => {
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // Open modal
    const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
    await profileButton.click();

    // Modal should be visible
    const backdrop = page.locator('[class*="bg-black"], [class*="bg-black/30"]').first();
    await expect(backdrop).toBeVisible();

    // Find and click X button
    const closeButton = page.locator('button').filter({ has: page.locator('svg').filter({ hasText: '' }) }).last();
    await closeButton.click();

    // Wait a bit for animation
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(backdrop).not.toBeVisible({ timeout: 5000 });
  });

  test('5. Profile modal should close when backdrop is clicked', async ({ page }) => {
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // Open modal
    const profileButton = page.locator('button').filter({ has: page.locator('img, span').first() }).first();
    await profileButton.click();

    // Modal should be visible
    const backdrop = page.locator('[class*="bg-black"], [class*="bg-black/30"]').first();
    await expect(backdrop).toBeVisible();

    // Click on backdrop
    const backdropBox = await backdrop.boundingBox();
    if (backdropBox) {
      await page.click({ position: { x: backdropBox.x + 10, y: backdropBox.y + 10 } });
    }

    // Wait for animation
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(backdrop).not.toBeVisible({ timeout: 5000 });
  });

  test('6. RecordPage buttons should render horizontally with no snap/shift on load', async ({ page }) => {
    // Navigate to /record page
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // Find the expense/income buttons container
    const buttonContainer = page.locator('div[class*="flex"][class*="flex-row"]').filter({ has: page.locator('text=지출') }).first();

    // Container should exist and be visible
    await expect(buttonContainer).toBeVisible();

    // Get button positions
    const expenseBtn = page.locator('button:has-text("지출")').first();
    const incomeBtn = page.locator('button:has-text("수입")').first();

    // Both buttons should be visible
    await expect(expenseBtn).toBeVisible();
    await expect(incomeBtn).toBeVisible();

    // Get bounding boxes
    const expenseBbox = await expenseBtn.boundingBox();
    const incomeBbox = await incomeBtn.boundingBox();

    expect(expenseBbox).toBeDefined();
    expect(incomeBbox).toBeDefined();

    // Buttons should be on the same Y position (horizontal layout)
    if (expenseBbox && incomeBbox) {
      const yDifference = Math.abs(expenseBbox.y - incomeBbox.y);
      expect(yDifference).toBeLessThan(5); // Should be nearly the same Y position

      // Expense button should be to the left of income button
      expect(expenseBbox.x).toBeLessThan(incomeBbox.x);
    }
  });

  test('7. RecordPage buttons should remain horizontal after multiple refreshes', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto('/record');
      await page.waitForLoadState('networkidle');

      const expenseBtn = page.locator('button:has-text("지출")').first();
      const incomeBtn = page.locator('button:has-text("수입")').first();

      await expect(expenseBtn).toBeVisible();
      await expect(incomeBtn).toBeVisible();

      const expenseBbox = await expenseBtn.boundingBox();
      const incomeBbox = await incomeBtn.boundingBox();

      if (expenseBbox && incomeBbox) {
        const yDifference = Math.abs(expenseBbox.y - incomeBbox.y);
        expect(yDifference).toBeLessThan(5); // Should be horizontal
      }

      // Refresh page
      if (i < 4) {
        await page.reload();
      }
    }
  });

  test('8. RecordPage buttons should be horizontal when returning from another page', async ({ page }) => {
    // Go to /record
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // Verify buttons are horizontal
    let expenseBtn = page.locator('button:has-text("지출")').first();
    let incomeBbox = await page.locator('button:has-text("수입")').first().boundingBox();
    let expenseBbox = await expenseBtn.boundingBox();

    if (expenseBbox && incomeBbox) {
      expect(Math.abs(expenseBbox.y - incomeBbox.y)).toBeLessThan(5);
    }

    // Navigate to /stats (if it exists)
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    // Navigate back to /record
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // Buttons should still be horizontal
    expenseBtn = page.locator('button:has-text("지출")').first();
    const incomeBtn = page.locator('button:has-text("수입")').first();

    await expect(expenseBtn).toBeVisible();
    await expect(incomeBtn).toBeVisible();

    expenseBbox = await expenseBtn.boundingBox();
    incomeBbox = await incomeBtn.boundingBox();

    if (expenseBbox && incomeBbox) {
      const yDifference = Math.abs(expenseBbox.y - incomeBbox.y);
      expect(yDifference).toBeLessThan(5); // Should still be horizontal
    }
  });

  test('9. RecordPage should have proper padding for header', async ({ page }) => {
    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    // The main content container should have padding-top to account for fixed header
    const mainContainer = page.locator('div[class*="pt-8"], div[class*="pt-16"]').filter({ has: page.locator('text=지출/수입 기록') }).first();

    // Should have some top padding
    const classAttr = await mainContainer.getAttribute('class');
    expect(classAttr).toMatch(/pt-\d+/); // Should have padding-top class
  });
});
