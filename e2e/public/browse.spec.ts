import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Browse Page', () => {
	test('shows page heading', async ({ page }) => {
		await page.goto('/browse');

		await expect(
			page.getByRole('heading', {
				name: 'Pick the prize you actually want',
			}),
		).toBeVisible();
	});

	test('shows raffle cards or empty state', async ({ page }) => {
		await page.goto('/browse');

		const hasCards = await page
			.locator('[data-testid="raffle-card"]')
			.or(page.getByRole('link', { name: /raffle/i }))
			.first()
			.isVisible()
			.catch(() => false);
		const hasEmpty = await page
			.getByText('No raffles found')
			.isVisible()
			.catch(() => false);

		expect(hasCards || hasEmpty).toBe(true);
	});
});
