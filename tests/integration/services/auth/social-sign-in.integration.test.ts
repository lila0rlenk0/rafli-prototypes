import { describe, expect, mock, test } from 'bun:test';

import { AUTH_ERROR_CODES } from '@/types/errors/auth-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Mocks ---
// social-sign-in.ts is 'use client' and uses browserClient from @/lib/api/client-browser

const mockPost = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('@/lib/api/client-browser', () => ({
	browserClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));
mock.module('@/lib/analytics/mixpanel-client', () => ({
	track: mock(),
}));

const { initiateSocialSignIn } = await import(
	'@/services/auth/social-sign-in'
);

/** Valid input matching socialSignInInputSchema */
const VALID_INPUT = {
	provider: 'google' as const,
	callbackURL: 'https://app.test/auth/callback',
};

/** Valid backend response matching socialSignInResponseSchema */
const VALID_RESPONSE = {
	redirect: true,
	url: 'https://accounts.google.com/o/oauth2/auth?client_id=abc',
};

describe('initiateSocialSignIn', () => {
	test('returns redirect URL on valid response', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await initiateSocialSignIn(VALID_INPUT);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.url).toBe(VALID_RESPONSE.url);
			expect(result.data.redirect).toBe(true);
		}
	});

	test('returns SOCIAL_LOGIN_FAILED on invalid input', async () => {
		// Invalid provider fails socialSignInInputSchema
		const result = await initiateSocialSignIn({
			provider: 'invalid' as 'google',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED);
		}
	});

	test('returns SOCIAL_PROVIDER_ERROR on invalid response shape (contract drift)', async () => {
		// Missing required `url` and `redirect` fields — triggers ZodError on .parse()
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ invalid: true }));

		const result = await initiateSocialSignIn(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.SOCIAL_PROVIDER_ERROR);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalled();
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await initiateSocialSignIn(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await initiateSocialSignIn(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await initiateSocialSignIn(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockPost.mockRejectedValueOnce(axiosError);

		await initiateSocialSignIn(VALID_INPUT);

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'social-sign-in' },
		);
	});
});
