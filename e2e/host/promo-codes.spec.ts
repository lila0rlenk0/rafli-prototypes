import { expect, test } from '@playwright/test';

import { createTestRaffle } from './helpers/create-test-raffle';

test.describe.serial('Promo Codes', () => {
	test.setTimeout(90_000);

	let raffleTitle: string;

	test('create raffle and navigate to promo codes', async ({ page }) => {
		const { title } = await createTestRaffle(page, { startToday: true });
		raffleTitle = title;

		// Close modal → go to my-raffles
		await page.getByRole('button', { name: 'View my raffles' }).click();
		await expect(page).toHaveURL('/my-raffles');

		// Find raffle card in Live tab (default) and click Details
		const card = page.getByText(raffleTitle).first();
		await expect(card).toBeVisible({ timeout: 10_000 });

		// Click Details button (it's a link wrapping a button)
		const cardContainer = card.locator('..').locator('..').locator('..');
		await cardContainer.getByRole('link', { name: 'Details' }).click();

		// Wait for raffle detail page
		await page.waitForURL(/\/browse\/.+/);

		// Find and click "See promo codes" link
		const promoLink = page.getByRole('link', { name: 'See promo codes' });
		await expect(promoLink).toBeVisible({ timeout: 15_000 });
		await promoLink.click();

		// Assert promo codes page
		await page.waitForURL(/\/promo-codes/);
		await expect(page.getByText('Manage promo codes')).toBeVisible();
	});

	test('creates promo codes via modal', async ({ page }) => {
		// Navigate directly to my-raffles, find the raffle, go to promo codes
		await page.goto('/my-raffles');

		const card = page.getByText(raffleTitle).first();
		await expect(card).toBeVisible({ timeout: 10_000 });

		const cardContainer = card.locator('..').locator('..').locator('..');
		await cardContainer.getByRole('link', { name: 'Details' }).click();
		await page.waitForURL(/\/browse\/.+/);

		const promoLink = page.getByRole('link', { name: 'See promo codes' });
		await expect(promoLink).toBeVisible({ timeout: 15_000 });
		await promoLink.click();
		await page.waitForURL(/\/promo-codes/);

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
