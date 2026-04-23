import { expect, type Page } from '@playwright/test';

import {
	fillBasicInfoStep,
	fillDatesAndTicketsStep,
} from './raffle-form-fill';

interface CreateTestRaffleOptions {
	/** When true, start date = today (auto-publishes). When false, start date = today + 2 days (scheduled). */
	startToday: boolean;
}

interface CreateTestRaffleResult {
	title: string;
}

/**
 * Drives the 3-step raffle creation wizard end-to-end. Delegates step
 * filling to `raffle-form-fill` helpers so this file stays focused on
 * navigation + success assertions. Returns the generated title so
 * callers can locate the resulting card in the host dashboard.
 */
export async function createTestRaffle(
	page: Page,
	options: CreateTestRaffleOptions,
): Promise<CreateTestRaffleResult> {
	const timestamp = new Date().toISOString();
	const scenario = options.startToday ? 'Live Raffle' : 'Scheduled';
	const title = `[E2E] ${scenario} ${Date.now()}`;
	const description = `Automated E2E test — ${scenario}. Created at ${timestamp}. Safe to delete.`;

	await page.goto('/my-raffles');
	await page.getByRole('link', { name: 'Create new Sweepstakes' }).click();
	await page.waitForURL('/my-raffles/create');

	await fillBasicInfoStep(page, title, description);
	await fillDatesAndTicketsStep(page, options.startToday);

	await page.getByRole('button', { name: 'Create' }).click();

	// Success copy differs by scenario — live raffles announce immediately,
	// scheduled ones land in the queue state.
	if (options.startToday) {
		await expect(page.getByText('Your sweepstakes is live!')).toBeVisible({
			timeout: 30_000,
		});
	} else {
		await expect(
			page.getByText('All set! Your sweepstakes is in the queue'),
		).toBeVisible({ timeout: 30_000 });
	}

	return { title };
}
