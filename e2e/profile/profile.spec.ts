import { test, expect } from '@playwright/test';

test.describe('Page Load & Layout', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/profile');
	});

	test('shows profile page with all sections', async ({ page }) => {
		await expect(
			page.getByRole('heading', { name: 'My Profile' }),
		).toBeVisible();

		await expect(page.locator('#personal-information')).toBeVisible();
		await expect(page.locator('#security')).toBeVisible();
		await expect(page.locator('#email-preferences')).toBeVisible();
		await expect(page.locator('#payment-history')).toBeVisible();
	});

	test('shows sidebar navigation items', async ({ page }) => {
		await expect(
			page.getByRole('button', { name: 'Personal Information' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Security' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Email Preferences' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Payment History' }),
		).toBeVisible();
	});

	test('shows sign out button', async ({ page }) => {
		await expect(
			page.getByRole('button', { name: /sign out/i }),
		).toBeVisible();
	});
});
