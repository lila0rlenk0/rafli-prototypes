import { expect, test } from '@playwright/test';

import { createTestRaffle } from './helpers/create-test-raffle';

test.describe('Create Raffle — Auto-Publish (Live)', () => {
	test.setTimeout(90_000);

	test('host creates raffle with today start date and it goes live', async ({
		page,
	}) => {
		const { title } = await createTestRaffle(page, { startToday: true });

		// Assert live modal content
		await expect(page.getByText('Your raffle is live!')).toBeVisible();
		await expect(page.getByText('Share your raffle!')).toBeVisible();

		// Navigate back to my-raffles
		await page.getByRole('button', { name: 'View my raffles' }).click();
		await expect(page).toHaveURL('/my-raffles');

		// Verify raffle appears in the Live tab (default)
		await expect(page.getByText(title).first()).toBeVisible({
			timeout: 10_000,
		});
	});
});
