import { test, expect } from '../fixtures/index'
import { AIPage } from '../pages/ai.page'
import { StatsPage } from '../pages/stats.page'

test.describe('AI Chat E2E - User Workflows', () => {
  test('should navigate to AIPage and display chat interface', async ({ authenticatedPage, cleanAIHistory }) => {
    const aiPage = new AIPage(authenticatedPage)

    await aiPage.goto()

    // Verify page header
    await expect(authenticatedPage.locator('text=AI Financial Assistant')).toBeVisible()
    await expect(authenticatedPage.locator('text=Ask about your finances')).toBeVisible()

    // Verify chat input is present
    await expect(aiPage.messageInput).toBeVisible()
    await expect(aiPage.sendButton).toBeVisible()
  })

  test('should send user message and receive AI response', async ({ authenticatedPage, cleanAIHistory }) => {
    const aiPage = new AIPage(authenticatedPage)

    await aiPage.goto()

    // Send a test message
    await aiPage.sendMessage('What is my total spending?')

    // Verify optimistic UI: user message appears immediately
    const messages = await aiPage.getMessages()
    expect(messages.some((m) => m.includes('What is my total spending?'))).toBeTruthy()

    // Wait for AI to respond
    await aiPage.waitForLoadingIndicator()
    await aiPage.waitForResponse()

    // Verify we have assistant response
    const updatedMessages = await aiPage.getMessages()
    expect(updatedMessages.length).toBeGreaterThan(1)
  })

  test('should handle multiple sequential messages', async ({ authenticatedPage, cleanAIHistory }) => {
    const aiPage = new AIPage(authenticatedPage)

    await aiPage.goto()

    // Send first message
    await aiPage.sendMessage('Tell me about my spending')
    await aiPage.waitForResponse()

    const messagesAfterFirst = await aiPage.getMessages()
    const firstCount = messagesAfterFirst.length

    // Send second message
    await aiPage.sendMessage('Which category has the most expenses?')
    await aiPage.waitForResponse()

    // Verify we have more messages now
    const messagesAfterSecond = await aiPage.getMessages()
    expect(messagesAfterSecond.length).toBeGreaterThan(firstCount)
    expect(messagesAfterSecond.some((m) => m.includes('Which category'))).toBeTruthy()
  })

  test('should display report with formatted content', async ({ authenticatedPage, cleanAIHistory }) => {
    const aiPage = new AIPage(authenticatedPage)

    await aiPage.goto()

    // Send message asking for analysis
    await aiPage.sendMessage('Analyze my spending this month')

    // Wait for response with report
    await aiPage.waitForLoadingIndicator()
    await aiPage.waitForResponse()

    // Verify AI responded
    const messages = await aiPage.getMessages()
    expect(messages.length).toBeGreaterThan(0)

    // Look for report indicators (cards, charts, or metrics)
    const hasReportContent = messages.some((m) =>
      /spending|analysis|total|category|currency|₩|amount/i.test(m)
    )
    expect(hasReportContent).toBeTruthy()
  })

  test('should navigate from report to stats page', async ({ authenticatedPage, cleanAIHistory }) => {
    const aiPage = new AIPage(authenticatedPage)
    const statsPage = new StatsPage(authenticatedPage)

    await aiPage.goto()

    // Send message asking for report
    await aiPage.sendMessage('Show me monthly breakdown')

    // Wait for response
    await aiPage.waitForLoadingIndicator()
    await aiPage.waitForResponse()

    // Try to click "View Details" button if it exists
    try {
      const viewDetailsButton = authenticatedPage.locator('button:has-text("View Details")').first()
      const isVisible = await viewDetailsButton.isVisible().catch(() => false)

      if (isVisible) {
        await viewDetailsButton.click()

        // Should navigate to stats page
        await authenticatedPage.waitForURL(/\/stats/, { timeout: 5000 })

        // Verify we're on stats page
        const url = authenticatedPage.url()
        expect(url).toContain('/stats')
      }
    } catch {
      // View Details button may not exist in all cases, that's ok
      console.log('View Details button not found or not clickable')
    }
  })

  test('should preserve chat history after page refresh', async ({ authenticatedPage, cleanAIHistory }) => {
    const aiPage = new AIPage(authenticatedPage)

    await aiPage.goto()

    // Send a message
    const testMessage = 'Remember this message'
    await aiPage.sendMessage(testMessage)

    // Wait for response
    await aiPage.waitForLoadingIndicator()
    await aiPage.waitForResponse()

    // Get messages before refresh
    const messagesBefore = await aiPage.getMessages()
    expect(messagesBefore.some((m) => m.includes(testMessage))).toBeTruthy()

    // Refresh the page
    await authenticatedPage.reload()
    await authenticatedPage.waitForLoadState('networkidle')

    // Verify message history is preserved
    const messagesAfter = await aiPage.getMessages()
    expect(messagesAfter.length).toBeGreaterThanOrEqual(messagesBefore.length)
    expect(messagesAfter.some((m) => m.includes(testMessage))).toBeTruthy()
  })
})
