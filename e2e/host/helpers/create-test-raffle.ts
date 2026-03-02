import fs from 'fs';
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
 * Picks a day in the currently open calendar popover.
 * Navigates months forward if the target date is in a later month than the reference.
 * Scopes to the visible popover to avoid matching hidden calendars.
 */
async function pickCalendarDay(
	page: Page,
	target: Date,
	reference: Date,
): Promise<void> {
	const popover = page
		.locator('[data-slot="popover-content"]:visible')
		.last();
	const calendar = popover.locator('[data-slot="calendar"]');

	// Navigate forward month by month if needed
	const monthsToNavigate =
		(target.getFullYear() - reference.getFullYear()) * 12 +
		(target.getMonth() - reference.getMonth());

	for (let i = 0; i < monthsToNavigate; i++) {
		await calendar
			.getByRole('button', { name: 'Go to the Next Month' })
			.click();
	}

	// Click the day button using data-day attribute (locale-formatted date string)
	await calendar
		.locator(`button[data-day="${target.toLocaleDateString()}"]`)
		.click();
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

	// Upload test image via simulated drop event (react-dropzone ignores setInputFiles)
	const imageBuffer = fs.readFileSync(TEST_IMAGE);
	const dropzone = page.locator('button', {
		hasText: /upload|drag/i,
	});
	await dropzone.evaluate(
		(el, buffer) => {
			const file = new File([new Uint8Array(buffer)], 'test-image.png', {
				type: 'image/png',
			});
			const dt = new DataTransfer();
			dt.items.add(file);
			el.dispatchEvent(
				new DragEvent('drop', { dataTransfer: dt, bubbles: true }),
			);
		},
		[...imageBuffer],
	);

	// Verify image was accepted by Dropzone (preview should appear)
	await expect(page.getByText('test-image.png')).toBeVisible({
		timeout: 5_000,
	});

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
	const todayMidnight = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);

	// Calculate start date
	const startDate = new Date(todayMidnight);
	if (!options.startToday) {
		startDate.setDate(startDate.getDate() + 2);
	}

	// Select start date
	await page.getByRole('button', { name: 'Select start date' }).click();
	await pickCalendarDay(page, startDate, todayMidnight);

	// Calculate end date (31 days from start)
	const endDate = new Date(startDate);
	endDate.setDate(endDate.getDate() + 31);

	// Select end date
	await page.getByRole('button', { name: 'Select end date' }).click();
	await pickCalendarDay(page, endDate, todayMidnight);

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
