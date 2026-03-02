import { expect, test } from '@playwright/test';

const RAFFLE_SLUG = 'test-raffle-rt7qh';

test.describe.serial('Promo Codes', () => {
	test.setTimeout(90_000);

	test('navigate to promo codes page', async ({ page }) => {
		// Navigate directly to raffle detail page
		await page.goto(`/browse/${RAFFLE_SLUG}`);

		// Find and click "See promo codes" link
		const promoLink = page.getByRole('link', { name: 'See promo codes' });
		await expect(promoLink).toBeVisible({ timeout: 15_000 });
		await promoLink.click();

		// Assert promo codes page
		await page.waitForURL(/\/promo-codes/);
		await expect(page.getByText('Manage promo codes')).toBeVisible();
	});

	test('creates promo codes via modal', async ({ page }) => {
		// Navigate directly to promo codes page
		await page.goto(`/my-raffles/${RAFFLE_SLUG}/promo-codes`);
		await expect(page.getByText('Manage promo codes')).toBeVisible({
			timeout: 15_000,
		});

		// Click "Create Code" button
		await page.getByRole('button', { name: 'Create Code' }).click();

		// Fill promo code form
		await page.locator('#count').fill('3');
		await page.locator('#discount_fixed').click();
		await page.locator('#value').fill('2');
		await page.locator('#maxUses').fill('5');
		// noExpiration checkbox is checked by default — leave it

		// Submit
		await page.getByRole('button', { name: 'Create' }).click();

		// Assert success state
		await expect(page.getByText('3 Codes Created!')).toBeVisible({
			timeout: 15_000,
		});

		// Verify promo code items are shown (font-mono elements)
		const codeItems = page.locator('.font-mono');
		await expect(codeItems.first()).toBeVisible();
		const count = await codeItems.count();
		expect(count).toBeGreaterThanOrEqual(3);

		// Close success modal
		await page.getByRole('button', { name: 'Done' }).click();
	});
});
