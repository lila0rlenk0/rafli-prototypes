import { describe, expect, mock, test } from 'bun:test';

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

const { resendVerificationEmail } = await import(
	'@/services/auth/resend-verification-email'
);

describe('resendVerificationEmail', () => {
	test('returns success on valid request', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		const result = await resendVerificationEmail('test@example.com');

		expect(result.success).toBe(true);
	});

	test('returns success on 404 — prevents user enumeration', async () => {
		// 4XX errors silently succeed to prevent leaking account existence
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 404 }));

		const result = await resendVerificationEmail('unknown@example.com');

		expect(result.success).toBe(true);
	});

	test('returns success on 400 — prevents user enumeration', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 400 }));

		const result = await resendVerificationEmail('test@example.com');

		expect(result.success).toBe(true);
	});

	test('surfaces network_error (infrastructure failure)', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await resendVerificationEmail('test@example.com');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('surfaces timeout_error (infrastructure failure)', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await resendVerificationEmail('test@example.com');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('surfaces internal_server_error (infrastructure failure)', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await resendVerificationEmail('test@example.com');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});

	test('surfaces global_ratelimit_exceeded (infrastructure failure)', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 429,
				data: { type: 'urn:raffles:problem:global:ratelimit:exceeded' },
			}),
		);

		const result = await resendVerificationEmail('test@example.com');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED);
		}
	});

	test('calls captureServiceError on any API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockPost.mockRejectedValueOnce(axiosError);

		await resendVerificationEmail('test@example.com');

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'resend-verification-email' },
		);
	});
});
