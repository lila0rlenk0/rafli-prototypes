import { describe, expect, mock, test } from 'bun:test';

import { USER_MODE } from '@/types/user-mode';

// --- Mocks ---

const mockGet = mock();
const mockSet = mock();
const mockDelete = mock();

mock.module('next/headers', () => ({
	cookies: mock(async () => ({
		get: mockGet,
		set: mockSet,
		delete: mockDelete,
	})),
}));

// Freeze cookie names + options so tests assert against known values instead
// of the real env-derived config (which varies by NEXT_PUBLIC_APP_ENV).
const TEST_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: false,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 365,
	path: '/',
};

mock.module('@/lib/auth/constants', () => ({
	AUTH_COOKIES: {
		TOKEN: 'raffly-token',
		SESSION: 'raffly-session',
		USER_MODE: 'raffly-user-mode',
	},
	// `session` and other modules import `COOKIE_OPTIONS` — partial mocks are suite-order fragile.
	COOKIE_OPTIONS: {
		httpOnly: true,
		secure: false,
		sameSite: 'lax' as const,
		maxAge: 60 * 60 * 24 * 30,
		path: '/',
	},
	MODE_COOKIE_OPTIONS: TEST_COOKIE_OPTIONS,
}));

const { getUserModeCookie, setUserModeCookie, clearUserModeCookie } =
	await import('@/lib/mode/cookies');

function resetAllMocks(): void {
	mockGet.mockReset();
	mockSet.mockReset();
	mockDelete.mockReset();
}

describe('getUserModeCookie', () => {
	test('returns PARTICIPANT when cookie is absent', async () => {
		resetAllMocks();
		mockGet.mockReturnValueOnce(undefined);

		const mode = await getUserModeCookie();

		expect(mode).toBe(USER_MODE.PARTICIPANT);
		expect(mockGet).toHaveBeenCalledWith('raffly-user-mode');
	});

	test('returns HOST when cookie holds "host"', async () => {
		resetAllMocks();
		mockGet.mockReturnValueOnce({ value: 'host' });

		const mode = await getUserModeCookie();

		expect(mode).toBe(USER_MODE.HOST);
	});

	test('returns PARTICIPANT when cookie holds "participant"', async () => {
		resetAllMocks();
		mockGet.mockReturnValueOnce({ value: 'participant' });

		const mode = await getUserModeCookie();

		expect(mode).toBe(USER_MODE.PARTICIPANT);
	});

	test('defaults to PARTICIPANT when cookie value fails schema validation', async () => {
		resetAllMocks();
		// Anything outside the userModeSchema enum must not leak into app state —
		// stale cookies from a rolled-back release or tampering are the trigger
		mockGet.mockReturnValueOnce({ value: 'admin' });

		const mode = await getUserModeCookie();

		expect(mode).toBe(USER_MODE.PARTICIPANT);
	});

	test('defaults to PARTICIPANT when cookie value is empty string', async () => {
		resetAllMocks();
		// Empty string hits the early `!value` guard before schema parsing
		mockGet.mockReturnValueOnce({ value: '' });

		const mode = await getUserModeCookie();

		expect(mode).toBe(USER_MODE.PARTICIPANT);
	});
});

describe('setUserModeCookie', () => {
	test('writes HOST with mode cookie options', async () => {
		resetAllMocks();

		await setUserModeCookie(USER_MODE.HOST);

		expect(mockSet).toHaveBeenCalledWith(
			'raffly-user-mode',
			'host',
			TEST_COOKIE_OPTIONS,
		);
	});

	test('writes PARTICIPANT with mode cookie options', async () => {
		resetAllMocks();

		await setUserModeCookie(USER_MODE.PARTICIPANT);

		expect(mockSet).toHaveBeenCalledWith(
			'raffly-user-mode',
			'participant',
			TEST_COOKIE_OPTIONS,
		);
	});
});

describe('clearUserModeCookie', () => {
	test('deletes the user mode cookie', async () => {
		resetAllMocks();

		await clearUserModeCookie();

		expect(mockDelete).toHaveBeenCalledWith('raffly-user-mode');
	});
});
