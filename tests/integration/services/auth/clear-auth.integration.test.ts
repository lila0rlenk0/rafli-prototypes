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
mock.module('@/lib/auth/config', () => ({
	AUTH_COOKIES: { TOKEN: 'raffly-token', SESSION: 'raffly-session' },
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
