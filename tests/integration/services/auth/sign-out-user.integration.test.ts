import { describe, expect, mock, test } from 'bun:test';

// --- Mocks ---

const mockClearAuthCookies = mock();
const mockGetSession = mock();
const mockTrackAfter = mock();
const mockRunAfter = mock();
const mockClearSentryUser = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mock() },
	getClientIp: mock(() => Promise.resolve('203.0.113.1')),
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mockGetSession,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/sentry/user', () => ({
	setSentryUser: mock(),
	clearSentryUser: mockClearSentryUser,
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mockTrackAfter,
}));
mock.module('@/lib/utils/run-after', () => ({
	runAfter: mockRunAfter,
}));

// next/navigation redirect throws NEXT_REDIRECT — mock to capture the call
const mockRedirect = mock();
mockRedirect.mockImplementation(() => {
	throw new Error('NEXT_REDIRECT');
});
mock.module('next/navigation', () => ({
	redirect: mockRedirect,
}));

// clearAuthCookies is imported from sibling module
mock.module('@/services/auth/clear-auth', () => ({
	clearAuthCookies: mockClearAuthCookies,
}));

const { signOutUser } = await import('@/services/auth/sign-out-user');

describe('signOutUser', () => {
	test('clears cookies, fires analytics, schedules backend invalidation, and redirects when authenticated', async () => {
		mockClearAuthCookies.mockClear();
		mockRedirect.mockClear();
		mockTrackAfter.mockClear();
		mockRunAfter.mockClear();
		mockClearSentryUser.mockClear();
		mockGetSession.mockReturnValueOnce({
			user: { id: 'user-1' },
			token: 'jwt-token',
		});

		await expect(signOutUser()).rejects.toThrow('NEXT_REDIRECT');

		expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
		expect(mockClearSentryUser).toHaveBeenCalledTimes(1);
		expect(mockTrackAfter).toHaveBeenCalledTimes(1);
		// Backend invalidation is deferred via runAfter so the redirect is not gated on it.
		expect(mockRunAfter).toHaveBeenCalledTimes(1);
		expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
	});

	test('skips analytics and backend scheduling when no session, still clears cookies and redirects', async () => {
		mockClearAuthCookies.mockClear();
		mockRedirect.mockClear();
		mockTrackAfter.mockClear();
		mockRunAfter.mockClear();
		mockGetSession.mockReturnValueOnce(null);

		await expect(signOutUser()).rejects.toThrow('NEXT_REDIRECT');

		expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
		// No userId to attach — analytics skipped.
		expect(mockTrackAfter).not.toHaveBeenCalled();
		// No token to forward — backend invalidation skipped.
		expect(mockRunAfter).not.toHaveBeenCalled();
		expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
	});
});
