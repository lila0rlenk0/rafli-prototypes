import { expect, test as setup } from '@playwright/test';

const HOST_AUTH_FILE = 'e2e/.auth/host.json';

setup('authenticate as host', async ({ page }) => {
	// Sign in with shared test account
	await page.goto('/sign-in');

	await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
	await page.locator('#password').fill(process.env.E2E_USER_PASSWORD!);
	await page.getByRole('button', { name: 'Sign In' }).click();

	await page.waitForURL('/browse');
	await expect(page).toHaveURL('/browse');

	// Switch to Host Mode
	const modeButton = page.getByRole('button', {
		name: /Switch to Host Mode/,
	});
	await modeButton.click();

	// Wait for mode switch to complete
	await expect(
		page.getByRole('button', { name: /Switch to Participant Mode/ }),
	).toBeVisible({ timeout: 10_000 });

	await page.context().storageState({ path: HOST_AUTH_FILE });
});
