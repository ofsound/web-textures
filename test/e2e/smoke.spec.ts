import { test, expect } from '@playwright/test'

test('home page loads texture cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Texture Library')).toBeVisible()
})
