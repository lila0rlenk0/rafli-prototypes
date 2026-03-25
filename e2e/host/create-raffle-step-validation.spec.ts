import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const TEST_IMAGE = path.resolve(__dirname, '../fixtures/test-image.png');

/**
 * Fills Step 1 (Basic Info) with valid data so we can advance to Step 2.
 * Reuses the same patterns as create-test-raffle helper.
 */
async function fillBasicInfoStep(page: Page): Promise<void> {
	// Upload test image
	const imageBuffer = fs.readFileSync(TEST_IMAGE);
	const dropzone = page.locator('button', { hasText: /upload|drag/i });
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
	await expect(page.getByText('test-image.png')).toBeVisible({
		timeout: 5_000,
	});

	// Fill title
	await page.locator('#title').fill(`[E2E] Validation Test ${Date.now()}`);

	// Fill description
	const editor = page.locator('[contenteditable="true"]').first();
	await editor.click();
	await editor.fill('Automated E2E step validation test. Safe to delete.');

	// Fill declared value
	await page.locator('#price').fill('10');

	// Select category
	await page
		.getByRole('combobox')
		.filter({ hasText: 'Select category' })
		.click();
	await page.getByRole('option').first().click();
}

/**
 * Picks a day in the currently visible calendar popover.
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

	const monthsToNavigate =
		(target.getFullYear() - reference.getFullYear()) * 12 +
		(target.getMonth() - reference.getMonth());

	for (let i = 0; i < monthsToNavigate; i++) {
		await calendar
			.getByRole('button', { name: 'Go to the Next Month' })
			.click();
	}

	await calendar
		.locator(`button[data-day="${target.toLocaleDateString()}"]`)
		.click();
}

test.describe('Create Raffle — Step Validation', () => {
	test.setTimeout(90_000);

	test('shows validation errors on step 2 when start date is missing and only end date is set', async ({
		page,
	}) => {
		// Navigate to creation form
		await page.goto('/my-raffles');
		await page.getByRole('link', { name: 'Create new Raffle' }).click();
		await page.waitForURL('/my-raffles/create');

		// Fill step 1 and advance
		await fillBasicInfoStep(page);
		await page.getByRole('button', { name: 'Continue' }).click();

		// ---- Step 2: Only set end date, skip start date ----

		const today = new Date();
		const todayMidnight = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);

		// Set end date (31 days from today)
		const endDate = new Date(todayMidnight);
		endDate.setDate(endDate.getDate() + 31);
		await page.getByRole('button', { name: 'Select end date' }).click();
		await pickCalendarDay(page, endDate, todayMidnight);

		// Click Continue without filling start date (and other required fields)
		await page.getByRole('button', { name: 'Continue' }).click();

		// Assert: start date error is visible
		await expect(
			page.getByText('Start date is required'),
		).toBeVisible({ timeout: 5_000 });

		// Assert: we are still on step 2 (Review step heading should NOT be visible)
		await expect(
			page.getByRole('heading', { name: 'Review' }),
		).not.toBeVisible();

		// Assert: other missing field errors are also shown
		await expect(
			page.getByText('Price per ticket must be at least 0.5'),
		).toBeVisible();
		await expect(
			page.getByText('Number of winners must be at least 1'),
		).toBeVisible();
		await expect(
			page.getByText('Check-in question is required'),
		).toBeVisible();
	});
});
