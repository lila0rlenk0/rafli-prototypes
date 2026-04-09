import { describe, expect, mock, test } from 'bun:test';

import { AUTH_ERROR_CODES } from '@/types/errors/auth-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

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
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
}));

const { resetPassword } = await import('@/services/auth/reset-password');

/** Valid input matching resetPasswordInputSchema (min 12 char password) */
const VALID_INPUT = { token: 'reset-token-abc', newPassword: 'newpassword12!' };

describe('resetPassword', () => {
	test('returns success on valid reset', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		const result = await resetPassword(VALID_INPUT);

		expect(result.success).toBe(true);
	});

	test('maps token-invalid from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:auth:token:invalid' },
			}),
		);

		const result = await resetPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.INVALID_TOKEN);
		}
	});

	test('maps token-expired from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:auth:token:expired' },
			}),
		);

		const result = await resetPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.TOKEN_EXPIRED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await resetPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await resetPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await resetPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockPost.mockRejectedValueOnce(axiosError);

		await resetPassword(VALID_INPUT);

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'reset-password' },
		);
	});
});
