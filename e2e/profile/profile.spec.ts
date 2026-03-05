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

test.describe('Personal Information', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/profile');
	});

	test('displays user name and email', async ({ page }) => {
		const section = page.locator('#personal-information');

		await expect(section.getByText('Full Name', { exact: true })).toBeVisible();
		await expect(section.getByText('Email', { exact: true })).toBeVisible();

		// Verify the font-semibold name/email values exist and are non-empty
		const values = section.locator('.text-lg.font-semibold');
		await expect(values).toHaveCount(2);
		await expect(values.first()).not.toHaveText('');
		await expect(values.last()).not.toHaveText('');
	});

	test('displays bio or placeholder', async ({ page }) => {
		const section = page.locator('#personal-information');
		await expect(section.getByText('Bio', { exact: true })).toBeVisible();

		// Either has actual bio text or placeholder
		const bioElement = section.locator('[data-bio]');
		await expect(bioElement).toBeVisible();
	});

	test('can edit and save bio', async ({ page }) => {
		const section = page.locator('#personal-information');
		const testBio = `E2E test bio ${Date.now()}`;

		// Enter edit mode
		await section.getByRole('button', { name: 'Edit bio' }).click();

		// Type new bio
		const textarea = section.getByPlaceholder('Tell us about yourself...');
		await textarea.fill(testBio);

		// Save
		await section.getByRole('button', { name: 'Save bio' }).click();

		// Assert toast
		await expect(page.getByText('Bio updated successfully!')).toBeVisible();

		// Assert new bio visible
		await expect(section.getByText(testBio)).toBeVisible();
	});

	test('can cancel bio editing', async ({ page }) => {
		const section = page.locator('#personal-information');

		// Get current bio text before editing
		const bioElement = section.locator('[data-bio]');
		const originalText = await bioElement.textContent();

		// Enter edit mode
		await section.getByRole('button', { name: 'Edit bio' }).click();

		// Type something
		const textarea = section.getByPlaceholder('Tell us about yourself...');
		await textarea.fill('This should be discarded');

		// Cancel
		await section.getByRole('button', { name: 'Cancel editing' }).click();

		// Assert original text restored
		await expect(section.locator('[data-bio]')).toHaveText(originalText!);
	});

	test('shows character counter in bio edit mode', async ({ page }) => {
		const section = page.locator('#personal-information');

		await section.getByRole('button', { name: 'Edit bio' }).click();

		await expect(section.getByText(/\d+\/500/)).toBeVisible();
	});
});
