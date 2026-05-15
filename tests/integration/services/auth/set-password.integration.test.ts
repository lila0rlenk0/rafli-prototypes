import { describe, expect, mock, test } from 'bun:test';

import { AUTH_ERROR_CODES } from '@/types/errors/auth-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();
const mockCaptureServiceError = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));

const { setPassword } = await import('@/services/auth/set-password');

const VALID_INPUT = { newPassword: 'newpassword12!' };

describe('setPassword', () => {
	test('returns success on valid set-password', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		const result = await setPassword(VALID_INPUT);

		expect(result.success).toBe(true);
	});

	test('forwards body to POST /auth/set-password', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		await setPassword(VALID_INPUT);

		const [path, body] =
			mockPost.mock.calls[mockPost.mock.calls.length - 1] ?? [];
		expect(path).toBe('/auth/set-password');
		expect(body).toEqual(VALID_INPUT);
	});

	test('returns VALIDATION_ERROR on too-short password', async () => {
		// 11-char password fails the 12-char minimum; the service action's
		// safeParse short-circuits before any network call.
		const result = await setPassword({ newPassword: 'short11char' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps password-already-set from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:auth:password:already-set' },
			}),
		);

		const result = await setPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.PASSWORD_ALREADY_SET);
		}
	});

	test('maps password-compromised from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:auth:password:compromised' },
			}),
		);

		const result = await setPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.PASSWORD_COMPROMISED);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await setPassword(VALID_INPUT);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});
});
