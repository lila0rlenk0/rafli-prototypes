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
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mock(),
}));

const { requestPasswordReset } = await import(
	'@/services/auth/request-password-reset'
);

const VALID_INPUT = {
	email: 'test@example.com',
	captchaToken: 'cf-turnstile-token-abc',
};

describe('requestPasswordReset', () => {
	test('returns success on valid request', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		const result = await requestPasswordReset(VALID_INPUT);

		expect(result.success).toBe(true);
	});

	test('forwards captcha token via x-captcha-response header, omits from body', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		await requestPasswordReset(VALID_INPUT);

		expect(mockPost).toHaveBeenCalledWith(
			'/auth/forget-password',
			{ email: VALID_INPUT.email },
			{ headers: { 'x-captcha-response': VALID_INPUT.captchaToken } },
		);
	});

	test('returns success on 404 — prevents user enumeration', async () => {
		// 4XX errors silently succeed to prevent leaking account existence
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 404 }));

		const result = await requestPasswordReset(VALID_INPUT);

		expect(result.success).toBe(true);
	});

	test('returns success on 400 — prevents user enumeration', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 400 }));

		const result = await requestPasswordReset(VALID_INPUT);

		expect(result.success).toBe(true);
	});

	test('surfaces auth:captcha:failed (user must retry the challenge)', async () => {
		// Captcha rejections must NOT be enumeration-suppressed — user has no
		// way to retry without an actionable error message. A failed challenge
		// also doesn't leak account existence (it's pre-account-lookup).
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					message: 'Captcha verification failed',
					code: 'VERIFICATION_FAILED',
				},
			}),
		);

		const result = await requestPasswordReset(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.CAPTCHA_FAILED);
		}
	});

	test('surfaces network_error (infrastructure failure)', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await requestPasswordReset(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('surfaces timeout_error (infrastructure failure)', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await requestPasswordReset(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('surfaces internal_server_error (infrastructure failure)', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await requestPasswordReset(VALID_INPUT);

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

		const result = await requestPasswordReset(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED);
		}
	});

	test('calls captureServiceError on any API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockPost.mockRejectedValueOnce(axiosError);

		await requestPasswordReset(VALID_INPUT);

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'request-password-reset' },
		);
	});

	// Defence: unvalidated body lets an attacker inject fields the backend may
	// still honour — e.g. a tampered `redirectTo` (open-redirect inside reset
	// email) or future admin-only fields. Strip unknowns with Zod first.
	test('strips unknown fields before forwarding (mass-assignment defense)', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		const tampered = {
			...VALID_INPUT,
			role: 'admin',
			userId: 'victim',
		};

		await requestPasswordReset(tampered);

		// Body excludes the captchaToken (carried in header) AND the tampered fields
		expect(mockPost).toHaveBeenCalledWith(
			'/auth/forget-password',
			{ email: VALID_INPUT.email },
			{ headers: { 'x-captcha-response': VALID_INPUT.captchaToken } },
		);
	});

	test('rejects malformed email without hitting backend', async () => {
		mockPost.mockReset();

		const result = await requestPasswordReset({
			email: 'not-an-email',
			captchaToken: VALID_INPUT.captchaToken,
		});

		// Still success: enumeration-safe contract — but NO outbound call.
		expect(result.success).toBe(true);
		expect(mockPost).not.toHaveBeenCalled();
	});
});
