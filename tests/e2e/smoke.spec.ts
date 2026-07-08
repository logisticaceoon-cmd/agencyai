import { test, expect } from '@playwright/test'

test('landing page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/AgencyAI/)
})

test('sign-in page loads', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.locator('input[type="email"]')).toBeVisible()
})

test('unauthenticated dashboard redirects', async ({ page }) => {
  await page.goto('/dashboard')
  // Should redirect to sign-in or show auth error
  await expect(page.url()).toContain('sign')
})
