import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'

type AuthFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Try to navigate to AI page (may redirect to login if not authenticated)
    await page.goto('/')

    // Check if we're on login page
    const isLoginPage = await page.locator('text=/login|sign in/i').isVisible().catch(() => false)

    if (isLoginPage) {
      // Try to auto-login or skip auth flow
      // For now, just proceed - the backend may not require auth in dev mode
      // or we can add Supabase mock token setup here
      await page.goto('/ai')
    }

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    await use(page)
  },
})

export { expect } from '@playwright/test'
