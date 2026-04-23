import { describe, expect, mock, test } from 'bun:test';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Mocks ---

const mockPost = mock();
const mockClearAuthCookies = mock();
const mockGetSession = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
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
	clearSentryUser: mock(),
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mock(),
}));
mock.module('@/lib/utils/run-after', () => ({
	runAfter: mock(),
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
	test('calls backend sign-out, clears cookies, and redirects', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));
		mockGetSession.mockReturnValueOnce({ user: { id: 'user-1' } });

		// signOutUser always redirects — redirect throws NEXT_REDIRECT
		await expect(signOutUser()).rejects.toThrow('NEXT_REDIRECT');

		expect(mockClearAuthCookies).toHaveBeenCalled();
		expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
	});

	test('clears cookies and redirects even if backend sign-out fails', async () => {
		// Backend down — sign-out is best-effort
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));
		mockGetSession.mockReturnValueOnce(null);

		await expect(signOutUser()).rejects.toThrow('NEXT_REDIRECT');

		// Cookies still cleared despite backend failure
		expect(mockClearAuthCookies).toHaveBeenCalled();
		expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
	});

	test('clears cookies and redirects on network error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));
		mockGetSession.mockReturnValueOnce(null);

		await expect(signOutUser()).rejects.toThrow('NEXT_REDIRECT');

		expect(mockClearAuthCookies).toHaveBeenCalled();
		expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
	});
});
