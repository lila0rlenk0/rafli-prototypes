import { describe, expect, mock, test } from 'bun:test';

// --- Mocks ---

const mockDelete = mock();
const mockClearUserModeCookie = mock();

mock.module('next/headers', () => ({
	cookies: mock(async () => ({
		delete: mockDelete,
	})),
}));
mock.module('@/lib/mode/cookies', () => ({
	clearUserModeCookie: mockClearUserModeCookie,
}));
// Full surface — `mock.module` is global; missing exports break later imports of `session` etc.
mock.module('@/lib/auth/constants', () => ({
	AUTH_COOKIES: {
		TOKEN: 'raffly-token',
		SESSION: 'raffly-session',
		USER_MODE: 'raffly-user-mode',
	},
	COOKIE_OPTIONS: {
		httpOnly: true,
		secure: false,
		sameSite: 'lax' as const,
		maxAge: 60 * 60 * 24 * 30,
		path: '/',
	},
	MODE_COOKIE_OPTIONS: {
		httpOnly: true,
		secure: false,
		sameSite: 'lax' as const,
		maxAge: 60 * 60 * 24 * 365,
		path: '/',
	},
}));

const { clearAuthCookies } = await import('@/services/auth/clear-auth');

describe('clearAuthCookies', () => {
	test('deletes token and session cookies', async () => {
		await clearAuthCookies();

		expect(mockDelete).toHaveBeenCalledWith('raffly-token');
		expect(mockDelete).toHaveBeenCalledWith('raffly-session');
	});

	test('clears user mode cookie', async () => {
		await clearAuthCookies();

		expect(mockClearUserModeCookie).toHaveBeenCalled();
	});
});
