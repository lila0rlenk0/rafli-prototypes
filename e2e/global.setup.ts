import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
	await page.goto('/sign-in');

	// Sign-in defaults to magic-link mode; switch explicitly to password mode for E2E.
	const passwordModeButton = page.getByRole('button', {
		name: 'Login with a password',
	});
	if (await passwordModeButton.isVisible()) {
		await passwordModeButton.click();
	}

	await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
	await page.locator('#password').fill(process.env.E2E_USER_PASSWORD!);
	await page.getByRole('button', { name: 'Sign In' }).click();

	await page.waitForURL('/browse');
	await expect(page).toHaveURL('/browse');

	await page.context().storageState({ path: AUTH_FILE });
});
