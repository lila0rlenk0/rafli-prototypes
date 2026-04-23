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
			page.getByText('All set! Your sweepstakes is in the queue'),
		).toBeVisible();
		await expect(page.getByText('Share your sweepstakes!')).not.toBeVisible();

		// Navigate back to my-raffles
		await page.getByRole('button', { name: 'View my sweepstakes' }).click();
		await expect(page).toHaveURL('/my-raffles');

		// Switch to Scheduled tab to find draft/queued sweepstakes
		await page.getByRole('button', { name: 'Scheduled' }).click();

		// Verify sweepstakes appears
		await expect(page.getByText(title).first()).toBeVisible({
			timeout: 10_000,
		});
	});
});
