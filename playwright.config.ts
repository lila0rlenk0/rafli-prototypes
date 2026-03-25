import path from 'path';

import { defineConfig, devices } from '@playwright/test';

process.loadEnvFile(path.resolve(__dirname, '.env.test'));

const AUTH_FILE = path.join(__dirname, 'e2e/.auth/user.json');
const HOST_AUTH_FILE = path.join(__dirname, 'e2e/.auth/host.json');

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',

	use: {
		baseURL: 'http://localhost:3000',
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'setup',
			testMatch: /global\.setup\.ts/,
		},
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: AUTH_FILE,
			},
			dependencies: ['setup'],
		},
		{
			name: 'mobile',
			use: {
				...devices['Pixel 7'],
				storageState: AUTH_FILE,
			},
			testDir: './e2e/mobile',
			dependencies: ['setup'],
		},
		{
			name: 'host-setup',
			testMatch: /host\.setup\.ts/,
		},
		{
			name: 'host',
			testDir: './e2e/host',
			use: {
				...devices['Desktop Chrome'],
				storageState: HOST_AUTH_FILE,
			},
			dependencies: ['host-setup'],
		},
	],

	webServer: {
		command: 'bun run dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
	},
});
