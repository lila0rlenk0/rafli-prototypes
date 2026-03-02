import { expect, test } from '@playwright/test';

import { createTestRaffle } from './helpers/create-test-raffle';

test.describe('Create Raffle — Scheduled (Queued)', () => {
	test.setTimeout(90_000);

	test('host creates raffle with future start date and it is queued', async ({
		page,
	}) => {
		const { title } = await createTestRaffle(page, { startToday: false });

		// Assert scheduled modal content
		await expect(
			page.getByText('All set! Your raffle is in the queue'),
		).toBeVisible();
		await expect(page.getByText('Share your raffle!')).not.toBeVisible();

		// Navigate back to my-raffles
		await page.getByRole('button', { name: 'View my raffles' }).click();
		await expect(page).toHaveURL('/my-raffles');

		// Switch to Created tab to find draft/queued raffle
		await page.getByRole('button', { name: 'Created' }).click();

		// Verify raffle appears
		await expect(page.getByText(title).first()).toBeVisible({
			timeout: 10_000,
		});
	});
});
