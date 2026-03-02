import path from 'path';

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const TEST_IMAGE = path.resolve(__dirname, '../../fixtures/test-image.png');

interface CreateTestRaffleOptions {
	/** When true, start date = today (auto-publishes). When false, start date = today + 2 days (scheduled). */
	startToday: boolean;
}

interface CreateTestRaffleResult {
	title: string;
}

/**
 * Fills and submits the 3-step raffle creation form.
 * After submission, clicks "View my raffles" to navigate back.
 * Returns the raffle title for finding the card later.
 */
export async function createTestRaffle(
	page: Page,
	options: CreateTestRaffleOptions,
): Promise<CreateTestRaffleResult> {
	const timestamp = new Date().toISOString();
	const scenario = options.startToday ? 'Live Raffle' : 'Scheduled';
	const title = `[E2E] ${scenario} ${Date.now()}`;
	const description = `Automated E2E test — ${scenario}. Created at ${timestamp}. Safe to delete.`;

	// Navigate to creation form
	await page.goto('/my-raffles');
	await page.getByRole('link', { name: 'Create new Raffle' }).click();
	await page.waitForURL('/my-raffles/create');

	// ---- Step 0: Basic Info ----

	// Upload test image
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(TEST_IMAGE);

	// Fill title
	await page.locator('#title').fill(title);

	// Fill description in Lexical editor
	const editor = page.locator('[contenteditable="true"]').first();
	await editor.click();
	await editor.fill(description);

	// Fill declared value
	await page.locator('#price').fill('10');

	// Select category (first available option)
	await page
		.getByRole('combobox')
		.filter({ hasText: 'Select category' })
		.click();
	await page.getByRole('option').first().click();

	// Continue to step 1
	await page.getByRole('button', { name: 'Continue' }).click();

	// ---- Step 1: Dates & Tickets ----

	const today = new Date();

	// Calculate start date
	const startDate = new Date(today);
	if (!options.startToday) {
		startDate.setDate(startDate.getDate() + 2);
	}

	// Select start date
	await page.getByRole('button', { name: 'Select start date' }).click();

	// Navigate to correct month if start date is in a different month
	if (startDate.getMonth() !== today.getMonth()) {
		await page.getByRole('button', { name: /next/i }).click();
	}

	await page
		.getByRole('gridcell', {
			name: String(startDate.getDate()),
			exact: true,
		})
		.first()
		.click();

	// Calculate end date (31 days from start)
	const endDate = new Date(startDate);
	endDate.setDate(endDate.getDate() + 31);

	// Select end date
	await page.getByRole('button', { name: 'Select end date' }).click();

	// Navigate months in end date calendar to reach target month
	// The calendar opens at today's month, so we need to navigate forward
	const monthsToNavigate =
		(endDate.getFullYear() - today.getFullYear()) * 12 +
		(endDate.getMonth() - today.getMonth());

	for (let i = 0; i < monthsToNavigate; i++) {
		await page.getByRole('button', { name: /next/i }).click();
	}

	await page
		.getByRole('gridcell', {
			name: String(endDate.getDate()),
			exact: true,
		})
		.first()
		.click();

	// Fill ticket fields
	await page.locator('#pricePerTicket').fill('1');
	await page.locator('#numberOfWinners').fill('1');
	await page.locator('#minParticipants').fill('2');
	await page.locator('#maxParticipants').fill('0');

	// Select check-in question (first available)
	await page
		.getByRole('combobox')
		.filter({ hasText: 'Select question' })
		.click();
	await page.getByRole('option').first().click();

	// Continue to step 2 (review)
	await page.getByRole('button', { name: 'Continue' }).click();

	// ---- Step 2: Review & Submit ----

	await page.getByRole('button', { name: 'Create' }).click();

	// Wait for success modal
	if (options.startToday) {
		await expect(page.getByText('Your raffle is live!')).toBeVisible({
			timeout: 30_000,
		});
	} else {
		await expect(
			page.getByText('All set! Your raffle is in the queue'),
		).toBeVisible({ timeout: 30_000 });
	}

	return { title };
}
