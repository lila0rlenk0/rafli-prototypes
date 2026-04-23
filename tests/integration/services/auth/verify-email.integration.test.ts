import { describe, expect, mock, test } from 'bun:test';

import { AUTH_ERROR_CODES } from '@/types/errors/auth-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Mocks ---

const mockGet = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mockGet, post: mock() },
	authenticatedClient: { get: mock(), post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mock(),
}));

const { verifyEmail } = await import('@/services/auth/verify-email');

/** Valid backend response matching verifyEmailResponseSchema */
const VALID_RESPONSE = {
	message: 'Email verified',
	success: true,
	token: 'jwt-token',
	user: {
		id: 'user-1',
		email: 'test@example.com',
		emailVerified: true,
		name: 'Test',
	},
};

describe('verifyEmail', () => {
	test('returns verified data on valid token', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await verifyEmail('valid-token');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.success).toBe(true);
			expect(result.data.user?.id).toBe('user-1');
		}
	});

	test('returns INVALID_CREDENTIALS when backend returns success: false', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				message: 'Token expired',
				success: false,
			}),
		);

		const result = await verifyEmail('expired-token');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
		}
	});

	test('returns INVALID_CREDENTIALS on invalid response shape (contract drift)', async () => {
		// Missing required `message` and `success` fields — triggers ZodError
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ invalid: true }));

		const result = await verifyEmail('some-token');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
		}
		// captureContractDrift should be called for Zod parse failures
		expect(mockCaptureContractDrift).toHaveBeenCalled();
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await verifyEmail('some-token');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await verifyEmail('some-token');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await verifyEmail('some-token');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockGet.mockRejectedValueOnce(axiosError);

		await verifyEmail('some-token');

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'verify-email' },
		);
	});

	// Defence: empty / missing token should short-circuit before touching the
	// backend — prevents unnecessary load and removes a timing side-channel
	// between "empty token" and "malformed token" behaviour.
	test('rejects empty token without hitting backend', async () => {
		mockGet.mockReset();
		const result = await verifyEmail('');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
		}
		expect(mockGet).not.toHaveBeenCalled();
	});
});
