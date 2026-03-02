import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Sign In', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/sign-in');
	});

	test('shows sign-in page', async ({ page }) => {
		await expect(
			page.getByRole('heading', { name: 'Ready to sign in?' }),
		).toBeVisible();
	});

	test('valid credentials redirect to /browse', async ({ page }) => {
		await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
		await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD!);
		await page.getByRole('button', { name: 'Sign In' }).click();

		await expect(page).toHaveURL('/browse');
	});

	test('invalid credentials show error', async ({ page }) => {
		await page.getByLabel('Email').fill('wrong@example.com');
		await page.getByLabel('Password').fill('wrongpassword12');
		await page.getByRole('button', { name: 'Sign In' }).click();

		await expect(
			page.getByText('Invalid email or password.'),
		).toBeVisible();
	});

	test('client-side validation for short password', async ({ page }) => {
		await page.getByLabel('Email').fill('test@example.com');
		await page.getByLabel('Password').fill('short');
		await page.getByRole('button', { name: 'Sign In' }).click();

		await expect(
			page.getByText('Password must be at least 12 characters'),
		).toBeVisible();
	});

	test('has sign up link', async ({ page }) => {
		const link = page.getByRole('link', { name: 'Sign up' });
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', /\/sign-up/);
	});

	test('has forgot password link', async ({ page }) => {
		const link = page.getByRole('link', { name: 'Forgot your password?' });
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', '/forgot-password');
	});
});
