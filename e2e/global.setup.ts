import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/user.json';

function requireEnv(key: 'E2E_USER_EMAIL' | 'E2E_USER_PASSWORD'): string {
	const value = process.env[key];
	if (value === undefined || value === '') {
		throw new Error(`Missing required E2E env var: ${key}`);
	}
	return value;
}

setup('authenticate', async ({ page }) => {
	const email = requireEnv('E2E_USER_EMAIL');
	const password = requireEnv('E2E_USER_PASSWORD');

	await page.goto('/sign-in');

	// Sign-in defaults to magic-link mode; switch explicitly to password mode for E2E.
	const passwordModeButton = page.getByRole('button', {
		name: 'Login with a password',
	});
	if (await passwordModeButton.isVisible()) {
		await passwordModeButton.click();
	}

	await page.getByLabel('Email').fill(email);
	await page.locator('#password').fill(password);
	await page.getByRole('button', { name: 'Sign In' }).click();

	await page.waitForURL('/browse');
	await expect(page).toHaveURL('/browse');

	await page.context().storageState({ path: AUTH_FILE });
});
