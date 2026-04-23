import fs from 'fs';
import path from 'path';

import { expect, type Page } from '@playwright/test';

const TEST_IMAGE = path.resolve(__dirname, '../../fixtures/test-image.png');

/**
 * Picks a day in the currently open calendar popover. Navigates months
 * forward if the target is later than the reference month. Scoped to the
 * visible popover so hidden calendars from other fields don't match.
 */
export async function pickCalendarDay(
	page: Page,
	target: Date,
	reference: Date,
): Promise<void> {
	const popover = page.locator('[data-slot="popover-content"]:visible').last();
	const calendar = popover.locator('[data-slot="calendar"]');

	const monthsToNavigate =
		(target.getFullYear() - reference.getFullYear()) * 12 +
		(target.getMonth() - reference.getMonth());

	for (let i = 0; i < monthsToNavigate; i++) {
		await calendar
			.getByRole('button', { name: 'Go to the Next Month' })
			.click();
	}

	// Day buttons are keyed by locale-formatted date strings — matches the
	// popover's internal rendering so we click the exact target cell.
	await calendar
		.locator(`button[data-day="${target.toLocaleDateString()}"]`)
		.click();
}

/**
 * Fills the basic-info step — image drop, title, description, declared
 * value, and first available category. Leaves the wizard on the Dates &
 * Tickets step ready for `fillDatesAndTicketsStep`.
 */
export async function fillBasicInfoStep(
	page: Page,
	title: string,
	description: string,
): Promise<void> {
	// react-dropzone ignores setInputFiles, so synthesize a drop event
	// carrying the test fixture and let the component's handlers run.
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

	await page.locator('#title').fill(title);

	const editor = page.locator('[contenteditable="true"]').first();
	await editor.click();
	await editor.fill(description);

	await page.locator('#price').fill('10');

	await page
		.getByRole('combobox')
		.filter({ hasText: 'Select category' })
		.click();
	await page.getByRole('option').first().click();

	await page.getByRole('button', { name: 'Continue' }).click();
}

/**
 * Fills the dates & tickets step — start/end dates (31-day window),
 * pricing, winners, participant bounds, and first available check-in
 * question. Advances to the review step on completion.
 */
export async function fillDatesAndTicketsStep(
	page: Page,
	startToday: boolean,
): Promise<void> {
	const today = new Date();
	const todayMidnight = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);

	const startDate = new Date(todayMidnight);
	if (!startToday) {
		startDate.setDate(startDate.getDate() + 2);
	}

	await page.getByRole('button', { name: 'Select start date' }).click();
	await pickCalendarDay(page, startDate, todayMidnight);

	const endDate = new Date(startDate);
	endDate.setDate(endDate.getDate() + 31);

	await page.getByRole('button', { name: 'Select end date' }).click();
	await pickCalendarDay(page, endDate, todayMidnight);

	await page.locator('#pricePerTicket').fill('1');
	await page.locator('#numberOfWinners').fill('1');
	await page.locator('#minParticipants').fill('2');
	await page.locator('#maxParticipants').fill('0');

	await page
		.getByRole('combobox')
		.filter({ hasText: 'Select question' })
		.click();
	await page.getByRole('option').first().click();

	await page.getByRole('button', { name: 'Continue' }).click();
}
