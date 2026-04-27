import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Subscribe funnel', () => {
	test('shows the public credit purchase landing page', async ({ page }) => {
		await page.goto('/subscribe');

		await expect(
			page.getByRole('heading', { name: /Pay \$10\. Get \$11 back\./ }),
		).toBeVisible();
		await expect(
			page.getByText('Offer details: One-time charge of $10.'),
		).toBeVisible();
	});

	test('shows payment-received state before magic links are enabled', async ({
		page,
	}) => {
		await page.goto('/credits-claimed');

		await expect(
			page.getByRole('heading', { name: 'Payment received' }),
		).toBeVisible();
		await expect(
			page.getByRole('link', { name: 'Browse raffles' }),
		).toHaveAttribute('href', '/browse');
	});
});
