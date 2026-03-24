import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Raffle Card Consistency', () => {
	test('all raffle card titles have the same height', async ({ page }) => {
		await page.goto('/browse');

		const titles = page.locator('[data-testid="raffle-card-title"]');
		const count = await titles.count();

		/**
		 * Skip if fewer than 2 cards — nothing to compare.
		 * This avoids false failures in empty environments.
		 */
		if (count < 2) {
			test.skip();
			return;
		}

		const heights: number[] = [];

		for (let i = 0; i < count; i++) {
			const box = await titles.nth(i).boundingBox();
			expect(box).not.toBeNull();
			heights.push(box!.height);
		}

		/** Every title element should have the same height regardless of text length */
		const firstHeight = heights[0];
		for (let i = 1; i < heights.length; i++) {
			expect(heights[i]).toBeCloseTo(firstHeight, 0);
		}
	});
});
