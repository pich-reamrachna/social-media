import { expect, test } from '@playwright/test'

test('public legal pages render without auth', async ({ page }) => {
	await page.goto('/terms')
	await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible()

	await page.goto('/privacy')
	await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()

	await page.goto('/cookies')
	await expect(page.getByRole('heading', { level: 1, name: 'Cookie Policy' })).toBeVisible()
})
