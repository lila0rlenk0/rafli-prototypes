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
		// Pixel 7 project. `#checkout-action` is owned by the sticky's primary
		// CTA on mobile (see StickyBuyTicketsCta). The fixture raffle must be
		// live at test time — a missing CTA is a seed-data regression the
		// test should report loudly, not silently skip.
		const buyButton = page.locator('#checkout-action');
		await expect(
			buyButton,
			'Expected the mobile Buy CTA — fixture raffle must be live',
		).toBeVisible({ timeout: 10_000 });
		await buyButton.click();

		// Gate 2: fixture raffle must carry a question — without one the modal
		// never mounts and the mobile layout assertions below have nothing to
		// verify. Assert the precondition explicitly so the test fails loud.
		const modalTitle = page.getByRole('heading', {
			name: 'Quick check before you join',
		});
		await expect(
			modalTitle,
			'Expected a question modal — fixture raffle must define a question',
		).toBeVisible({ timeout: 5_000 });

		// Verify the modal dialog is visible and fullscreen on mobile
		const dialog = page.locator('[data-slot="dialog-content"]');
		await expect(dialog).toBeVisible();

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

		// Verify button fills the available width (no max-w-xs constraint).
		// On mobile fullscreen the dialog is viewport-wide, so the button
		// should be near-full.
		const buttonBox = await confirmButton.boundingBox();
		const dialogBox = await dialog.boundingBox();
		expect(buttonBox).toBeTruthy();
		expect(dialogBox).toBeTruthy();

		if (buttonBox && dialogBox) {
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

	test('radio options and labels are tappable on mobile', async ({ page }) => {
		await page.goto(`/browse/${RAFFLE_SLUG}`);

		const buyButton = page.locator('#checkout-action');
		await expect(buyButton).toBeVisible({ timeout: 10_000 });
		await buyButton.click();

		const modalTitle = page.getByRole('heading', {
			name: 'Quick check before you join',
		});
		await expect(modalTitle).toBeVisible({ timeout: 5_000 });

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
