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
		await expect(page.getByRole('button', { name: 'Security' })).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Email Preferences' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Payment History' }),
		).toBeVisible();
	});

	test('shows sign out button', async ({ page }) => {
		await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
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

test.describe('Security', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/profile');
	});

	test('shows change password button', async ({ page }) => {
		await expect(
			page.getByRole('button', { name: 'Change Password' }),
		).toBeVisible();
	});

	test('opens password form on click', async ({ page }) => {
		await page.getByRole('button', { name: 'Change Password' }).click();

		await expect(page.getByLabel('Current Password')).toBeVisible();
		await expect(
			page.getByLabel('New Password', { exact: true }),
		).toBeVisible();
		await expect(page.getByLabel('Confirm New Password')).toBeVisible();
	});

	test('validates minimum password length', async ({ page }) => {
		await page.getByRole('button', { name: 'Change Password' }).click();

		await page.getByLabel('Current Password').fill('currentpass123');
		await page.getByLabel('New Password', { exact: true }).fill('short');
		await page.getByLabel('Confirm New Password').fill('short');

		await page.getByRole('button', { name: 'Change Password' }).click();

		await expect(
			page.getByText('Password must be at least 12 characters'),
		).toBeVisible();
	});

	test('validates password confirmation mismatch', async ({ page }) => {
		await page.getByRole('button', { name: 'Change Password' }).click();

		await page.getByLabel('Current Password').fill('currentpass123');
		await page
			.getByLabel('New Password', { exact: true })
			.fill('newpassword1234');
		await page.getByLabel('Confirm New Password').fill('differentpass123');

		await page.getByRole('button', { name: 'Change Password' }).click();

		await expect(page.getByText('Passwords do not match')).toBeVisible();
	});

	test('can cancel password form', async ({ page }) => {
		await page.getByRole('button', { name: 'Change Password' }).click();

		// Verify form is open
		await expect(page.getByLabel('Current Password')).toBeVisible();

		// Cancel
		await page.getByRole('button', { name: 'Cancel' }).click();

		// Verify back to button state
		await expect(
			page.getByRole('button', { name: 'Change Password' }),
		).toBeVisible();
	});
});

test.describe('Email Preferences', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/profile');
	});

	test('shows all preference categories', async ({ page }) => {
		const section = page.locator('#email-preferences');

		await expect(section.getByText('Raffle Updates')).toBeVisible();
		await expect(section.getByText('Prize Updates')).toBeVisible();
		await expect(section.getByText('Host Notifications')).toBeVisible();
		await expect(section.getByText('Reviews', { exact: true })).toBeVisible();
	});

	test('shows preference toggle switches', async ({ page }) => {
		const section = page.locator('#email-preferences');

		await expect(
			section.getByRole('switch', { name: 'Raffle Updates' }),
		).toBeVisible();
		await expect(
			section.getByRole('switch', { name: 'Prize Updates' }),
		).toBeVisible();
		await expect(
			section.getByRole('switch', { name: 'Host Notifications' }),
		).toBeVisible();
		await expect(
			section.getByRole('switch', { name: 'Reviews' }),
		).toBeVisible();
	});

	test('can toggle a preference', async ({ page }) => {
		const section = page.locator('#email-preferences');
		const toggle = section.getByRole('switch', { name: 'Reviews' });

		const wasChecked = await toggle.isChecked();
		await toggle.click();

		// Verify state changed
		if (wasChecked) {
			await expect(toggle).not.toBeChecked();
		} else {
			await expect(toggle).toBeChecked();
		}

		// No error toast should appear
		await expect(
			page.getByText('Failed to update preference'),
		).not.toBeVisible();

		// Toggle back to restore original state
		await toggle.click();
	});

	test('shows transactional email notice', async ({ page }) => {
		await expect(page.getByText(/transactional emails/i)).toBeVisible();
	});
});

test.describe('Payment History', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/profile');
	});

	test('shows payment history heading', async ({ page }) => {
		await expect(
			page.getByRole('heading', { name: 'Payment History' }),
		).toBeVisible();
	});

	test('shows view all button linking to orders', async ({ page }) => {
		const section = page.locator('#payment-history');
		const link = section.getByRole('link', { name: 'View all' });

		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', '/profile/orders');
	});

	test('shows orders or empty state', async ({ page }) => {
		const section = page.locator('#payment-history');

		const hasOrders = await section
			.locator('.border-b, .border-gray-100')
			.first()
			.isVisible()
			.catch(() => false);

		if (!hasOrders) {
			await expect(section.getByText('No orders yet')).toBeVisible();
		}
	});
});
