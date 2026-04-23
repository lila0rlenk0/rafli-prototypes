import { describe, expect, mock, test } from 'bun:test';

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

const { resendVerificationEmail } =
	await import('@/services/auth/resend-verification-email');

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

	// Defence: without Zod validation an attacker can flood the backend with
	// garbage payloads (e.g. null, massively long strings, injection attempts).
	// Reject malformed email shapes at the BFF before any outbound call.
	test('rejects malformed email without hitting backend', async () => {
		mockPost.mockReset();

		const result = await resendVerificationEmail('not-an-email');

		// Contract stays enumeration-safe (success), but no backend call.
		expect(result.success).toBe(true);
		expect(mockPost).not.toHaveBeenCalled();
	});

	test('rejects empty email without hitting backend', async () => {
		mockPost.mockReset();

		const result = await resendVerificationEmail('');

		expect(result.success).toBe(true);
		expect(mockPost).not.toHaveBeenCalled();
	});
});
