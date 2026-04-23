import { describe, expect, mock, test } from 'bun:test';

import { AUTH_ERROR_CODES } from '@/types/errors/auth-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Mocks ---

const mockPost = mock();
const mockCaptureServiceError = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mockPost },
	authenticatedClient: { get: mock(), post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(),
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
}));
mock.module('@/lib/utils/run-after', () => ({
	runAfter: mock(),
}));

// Import AFTER mocking
const { signInUser } = await import('@/services/auth/sign-in-user');

/** Valid credentials matching signInInputSchema */
const VALID_INPUT = { email: 'test@example.com', password: 'password123' };

/** Minimal valid backend response for sign-in */
const VALID_RESPONSE = {
	token: 'jwt-token-abc',
	user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
};

describe('signInUser', () => {
	test('returns success on valid credentials', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await signInUser(VALID_INPUT);

		expect(result.success).toBe(true);
	});

	test('returns VALIDATION_ERROR on invalid input', async () => {
		// Empty password fails signInInputSchema min(1)
		const result = await signInUser({ email: 'bad', password: '' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('returns UNKNOWN_ERROR when backend returns no token', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ token: null, user: null }),
		);

		const result = await signInUser(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNKNOWN_ERROR);
		}
	});

	test('maps invalid-credentials from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { type: 'urn:raffles:problem:auth:user:invalid-credentials' },
			}),
		);

		const result = await signInUser(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await signInUser(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await signInUser(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await signInUser(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockPost.mockRejectedValueOnce(axiosError);

		await signInUser(VALID_INPUT);

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'sign-in-user' },
		);
	});
});
