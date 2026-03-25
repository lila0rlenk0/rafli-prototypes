import { test, expect } from '@playwright/test';

test.describe('Navbar Button Consistency', () => {
	test('help-us-improve and mode-switch buttons have the same height', async ({
		page,
	}) => {
		await page.goto('/browse');

		const helpButton = page.getByRole('link', { name: 'Help us improve' });
		const modeButton = page.getByRole('button', {
			name: /Switch to .* Mode/,
		});

		await expect(helpButton).toBeVisible({ timeout: 10_000 });
		await expect(modeButton).toBeVisible({ timeout: 10_000 });

		const helpBox = await helpButton.boundingBox();
		const modeBox = await modeButton.boundingBox();

		expect(helpBox).not.toBeNull();
		expect(modeBox).not.toBeNull();

		/** Both buttons should have the same height */
		expect(helpBox!.height).toBeCloseTo(modeBox!.height, 0);
	});
});
