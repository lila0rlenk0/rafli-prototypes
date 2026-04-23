import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Raffle Card Consistency', () => {
	test('all raffle card titles have the same height', async ({ page }) => {
		await page.goto('/browse');

		const titles = page.locator('[data-testid="raffle-card-title"]');

		// Assert the browse landing has ≥2 cards before measuring —
		// silently skipping on sparse environments hid a real regression
		// where the grid rendered empty. The browse fixture must seed at
		// least two live raffles for this comparison to be meaningful.
		await expect(
			titles,
			'Browse grid must surface ≥2 raffles for card-height parity check',
		).toHaveCount(await titles.count(), { timeout: 10_000 });
		const count = await titles.count();
		expect(
			count,
			'Expected at least 2 raffle cards on /browse; fixture may be empty',
		).toBeGreaterThanOrEqual(2);

		const heights: number[] = [];

		for (let i = 0; i < count; i++) {
			const box = await titles.nth(i).boundingBox();
			expect(box).not.toBeNull();
			if (box) heights.push(box.height);
		}

		/** Every title element should have the same height regardless of text length */
		const firstHeight = heights[0];
		for (let i = 1; i < heights.length; i++) {
			expect(heights[i]).toBeCloseTo(firstHeight, 0);
		}
	});
});
