import { test, expect } from '@playwright/test'

const routes = [
  '/',
  '/resume-builder',
  '/ai-studio',
  '/ocr',
  '/image-compress',
  '/watermark-removal',
  '/doc-convert',
]

for (const route of routes) {
  test(`mobile layout works on ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')

    const root = page.locator('#app')
    await expect(root).toBeVisible()

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)

    if (route === '/') {
      await page.getByRole('button').filter({ has: page.locator('svg') }).first().click({ trial: true }).catch(() => {})
    }
  })
}
