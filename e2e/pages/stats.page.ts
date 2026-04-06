import type { Page, Locator } from '@playwright/test'

export class StatsPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly monthDisplay: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('text=/Stats|Statistics|Monthly/i')
    this.monthDisplay = page.locator('[class*="month"]')
  }

  async goto(month?: string) {
    if (month) {
      await this.page.goto(`/stats?month=${month}`)
    } else {
      await this.page.goto('/stats')
    }
    await this.page.waitForLoadState('networkidle')
  }

  async getMonthDisplay(): Promise<string | null> {
    try {
      return await this.monthDisplay.first().textContent()
    } catch {
      return null
    }
  }

  async verifyCategoryExists(category: string): Promise<boolean> {
    try {
      await this.page.locator(`text=${category}`).waitFor({ timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  async getPageTitle(): Promise<string | null> {
    try {
      return await this.pageTitle.textContent()
    } catch {
      return null
    }
  }
}
