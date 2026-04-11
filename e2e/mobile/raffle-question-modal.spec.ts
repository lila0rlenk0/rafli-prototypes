import { expect, test } from '@playwright/test';

const RAFFLE_SLUG = '500-in-actual-silver-sbit5';

test.describe('Raffle Question Modal — Mobile', () => {
	test.setTimeout(60_000);

	test('modal elements are visible and properly laid out on mobile', async ({
		page,
	}) => {
		await page.goto(`/browse/${RAFFLE_SLUG}`);

		// Gate on the mobile sticky CTA's primary button — `#checkout-section`
		// is wrapped in `hidden lg:block` and therefore never visible on the
		// Pixel 7 project, so reading its visibility always returned false and
		// this test silently skipped on every mobile run. `#checkout-action`
		// is owned by the sticky's primary CTA on mobile (see
		// StickyBuyTicketsCta) so that's the correct mobile anchor.
		const buyButton = page.locator('#checkout-action');
		const hasBuyButton = await buyButton
			.isVisible({ timeout: 10_000 })
			.catch(() => false);

		if (!hasBuyButton) {
			test.skip(true, 'Raffle is not in an active/live state');
			return;
		}

		// Click the buy button to trigger the question modal
		await buyButton.click();

		// Check if the question modal appeared (raffle may not have a question)
		const modalTitle = page.getByRole('heading', {
			name: 'Quick check before you join',
		});
		const hasModal = await modalTitle
			.isVisible({ timeout: 5_000 })
			.catch(() => false);

		if (!hasModal) {
			test.skip(true, 'Raffle does not have a question configured');
			return;
		}

		// Verify the modal dialog is visible and fullscreen on mobile
		const dialog = page.locator('[data-slot="dialog-content"]');
		await expect(dialog).toBeVisible();

		// Verify title is visible
		await expect(modalTitle).toBeVisible();

		// Verify description is visible
		const description = page.getByText(
			'The host added a short question for participants',
		);
		await expect(description).toBeVisible();

		// Verify question text is visible
		const questionText = dialog.locator('.text-lg.font-semibold');
		await expect(questionText).toBeVisible();

		// Verify radio options are visible
		const radioGroup = dialog.locator('[role="radiogroup"]');
		await expect(radioGroup).toBeVisible();

		const radioItems = dialog.locator('[role="radio"]');
		const radioCount = await radioItems.count();
		expect(radioCount).toBeGreaterThan(0);

		// Verify all radio options are visible and not clipped
		for (let i = 0; i < radioCount; i++) {
			await expect(radioItems.nth(i)).toBeVisible();
		}

		// Verify the confirm button is visible
		const confirmButton = page.getByRole('button', { name: 'Confirm' });
		await expect(confirmButton).toBeVisible();

		// Verify button fills the available width (no max-w-xs constraint)
		const buttonBox = await confirmButton.boundingBox();
		const dialogBox = await dialog.boundingBox();
		expect(buttonBox).toBeTruthy();
		expect(dialogBox).toBeTruthy();

		if (buttonBox && dialogBox) {
			// Button should use most of the dialog width (accounting for padding)
			// On mobile fullscreen: dialog is viewport-wide, button should be near-full
			const buttonWidthRatio = buttonBox.width / dialogBox.width;
			expect(buttonWidthRatio).toBeGreaterThan(0.7);
		}

		// Verify no horizontal overflow — all content within viewport
		const viewportWidth = page.viewportSize()?.width ?? 390;

		const titleBox = await modalTitle.boundingBox();
		if (titleBox) {
			expect(titleBox.x).toBeGreaterThanOrEqual(0);
			expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(
				viewportWidth + 1,
			);
		}

		const radioGroupBox = await radioGroup.boundingBox();
		if (radioGroupBox) {
			expect(radioGroupBox.x).toBeGreaterThanOrEqual(0);
			expect(radioGroupBox.x + radioGroupBox.width).toBeLessThanOrEqual(
				viewportWidth + 1,
			);
		}
	});

	test('radio options and labels are tappable on mobile', async ({
		page,
	}) => {
		await page.goto(`/browse/${RAFFLE_SLUG}`);

		const buyButton = page.locator('#checkout-action');
		const hasBuyButton = await buyButton
			.isVisible({ timeout: 10_000 })
			.catch(() => false);

		if (!hasBuyButton) {
			test.skip(true, 'Raffle is not in an active/live state');
			return;
		}

		await buyButton.click();

		const modalTitle = page.getByRole('heading', {
			name: 'Quick check before you join',
		});
		const hasModal = await modalTitle
			.isVisible({ timeout: 5_000 })
			.catch(() => false);

		if (!hasModal) {
			test.skip(true, 'Raffle does not have a question configured');
			return;
		}

		const dialog = page.locator('[data-slot="dialog-content"]');

		// Wait for the question to load (radio options appear)
		const radioGroup = dialog.locator('[role="radiogroup"]');
		await expect(radioGroup).toBeVisible({ timeout: 10_000 });

		// Tap the first radio option via its label
		const labels = dialog.locator('label');
		await expect(labels.first()).toBeVisible();

		await labels.first().tap();

		// Verify the radio becomes checked after tap
		const firstRadio = dialog.locator('[role="radio"]').first();
		await expect(firstRadio).toHaveAttribute('data-state', 'checked');

		// Verify the confirm button becomes enabled
		const confirmButton = page.getByRole('button', { name: 'Confirm' });
		await expect(confirmButton).toBeEnabled();
	});
});
