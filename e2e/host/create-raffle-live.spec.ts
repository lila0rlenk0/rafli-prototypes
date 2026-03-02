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

		// Navigate to my-raffles with hard navigation to bypass Next.js router cache
		await page.goto('/my-raffles');

		// Check Live tab first (default)
		const liveCard = page.getByText(title).first();
		const isInLive = await liveCard
			.isVisible({ timeout: 5_000 })
			.catch(() => false);

		if (!isInLive) {
			// Raffle might still be in Created tab (publish can be async)
			await page.getByRole('button', { name: 'Created' }).click();
			await expect(page.getByText(title).first()).toBeVisible({
				timeout: 10_000,
			});
		}
	});
});
