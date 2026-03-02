import { expect, test } from '@playwright/test';

import { createTestRaffle } from './helpers/create-test-raffle';

test.describe.serial('Raffle Update', () => {
	test.setTimeout(90_000);

	test('create raffle and post update', async ({ page }) => {
		const { title } = await createTestRaffle(page, { startToday: true });

		// Close modal → go to my-raffles
		await page.getByRole('button', { name: 'View my raffles' }).click();
		await expect(page).toHaveURL('/my-raffles');

		// Find raffle card in Live tab and click Details
		const card = page.getByText(title).first();
		await expect(card).toBeVisible({ timeout: 10_000 });

		const cardContainer = card.locator('..').locator('..').locator('..');
		await cardContainer.getByRole('link', { name: 'Details' }).click();
		await page.waitForURL(/\/browse\/.+/);

		// Click "Add update" link
		const addUpdateLink = page.getByRole('link', { name: 'Add update' });
		await expect(addUpdateLink).toBeVisible({ timeout: 15_000 });
		await addUpdateLink.click();

		// Assert update page
		await page.waitForURL(/\/update/);
		await expect(page.getByText('New post')).toBeVisible();

		// Type update text in Lexical editor
		const editor = page.locator('[contenteditable="true"]').first();
		await editor.click();
		await editor.fill(
			`E2E test update posted at ${new Date().toISOString()}`,
		);

		// Submit update
		await page.getByRole('button', { name: 'Post Update' }).click();

		// Assert redirect back to raffle detail page
		await page.waitForURL(/\/browse\/.+/, { timeout: 15_000 });
		await expect(page.getByText(title)).toBeVisible();
	});
});
