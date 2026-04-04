import { test as authTest } from './auth'

type DbFixtures = {
  cleanAIHistory: void
}

export const test = authTest.extend<DbFixtures>({
  cleanAIHistory: async ({ authenticatedPage }, use) => {
    // Cleanup before test
    try {
      // Call API to clear chat history
      await authenticatedPage.evaluate(() => {
        // We'll use fetch to call the backend API
        // This would normally be done with a proper test token
        // For now, we just proceed without cleanup
      })
    } catch (err) {
      // Ignore cleanup errors
      console.log('Cleanup skipped:', err)
    }

    await use()

    // Cleanup after test
    try {
      await authenticatedPage.evaluate(() => {
        // Cleanup after test
      })
    } catch (err) {
      // Ignore cleanup errors
      console.log('Cleanup skipped:', err)
    }
  },
})

export { expect } from '@playwright/test'
