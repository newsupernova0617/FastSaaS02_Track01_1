import type { Page, Locator } from '@playwright/test'

export class AIPage {
  readonly page: Page
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly chatMessages: Locator
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    this.page = page
    this.messageInput = page.locator('textarea[placeholder*="ask about your finances"]')
    this.sendButton = page.locator('button[aria-label="Send message"]')
    this.chatMessages = page.locator('[class*="ChatBubble"]')
    this.loadingIndicator = page.locator('text=/AI is thinking|bouncing/i')
  }

  async goto() {
    await this.page.goto('/ai')
    await this.page.waitForLoadState('networkidle')
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text)
    await this.sendButton.click()
  }

  async waitForLoadingIndicator() {
    try {
      await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      // May not always show, that's ok
    }
  }

  async waitForResponse() {
    // Wait for at least 2 messages (user + assistant) or for loading to finish
    await this.page.waitForTimeout(1000)
    const messageCount = await this.chatMessages.count()

    // Poll for new messages while loading might still be happening
    let prevCount = 0
    let retries = 0
    while (retries < 30) {
      const currentCount = await this.chatMessages.count()
      if (currentCount > messageCount && currentCount > prevCount) {
        // Found new messages
        await this.page.waitForTimeout(500)
        break
      }
      prevCount = currentCount
      await this.page.waitForTimeout(500)
      retries++
    }
  }

  async getMessages(): Promise<string[]> {
    const elements = await this.chatMessages.all()
    const messages: string[] = []

    for (const element of elements) {
      const text = await element.textContent()
      if (text) {
        messages.push(text.trim())
      }
    }

    return messages
  }

  async getLastMessage(): Promise<string | null> {
    const messages = await this.getMessages()
    return messages.length > 0 ? messages[messages.length - 1] : null
  }

  async waitForReportCard(sectionTitle: string) {
    await this.page.locator(`text=${sectionTitle}`).waitFor({ timeout: 10000 })
  }

  async clickViewDetails() {
    // Find and click ActionButton
    await this.page.locator('button:has-text("View Details")').first().click()
  }

  async hasErrorMessage(): Promise<boolean> {
    try {
      const errorVisible = await this.page.locator('[class*="bg-red"]').isVisible()
      return errorVisible
    } catch {
      return false
    }
  }

  async clearError() {
    const errorElement = this.page.locator('[class*="bg-red"]')
    if (await errorElement.isVisible()) {
      // Wait for it to disappear naturally or timeout
      await errorElement.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    }
  }
}
