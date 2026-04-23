import { describe, expect, mock, test } from 'bun:test';

import { AUTH_ERROR_CODES } from '@/types/errors/auth-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Mocks ---

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

const { changePassword } = await import('@/services/auth/change-password');

/** Valid input matching changePasswordInputSchema */
const VALID_INPUT = {
	currentPassword: 'oldpassword1',
	newPassword: 'newpassword12!',
};

describe('changePassword', () => {
	test('returns success on valid password change', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		const result = await changePassword(VALID_INPUT);

		expect(result.success).toBe(true);
	});

	test('maps password-invalid from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:auth:password:invalid' },
			}),
		);

		const result = await changePassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.PASSWORD_INVALID);
		}
	});

	test('maps password-compromised from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:auth:password:compromised' },
			}),
		);

		const result = await changePassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(AUTH_ERROR_CODES.PASSWORD_COMPROMISED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await changePassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await changePassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await changePassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await changePassword(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockPost.mockRejectedValueOnce(axiosError);

		await changePassword(VALID_INPUT);

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'change-password' },
		);
	});

	// Defence: server actions are public POST endpoints — attackers can add
	// arbitrary fields to the body (mass-assignment). Input must be
	// Zod-validated so extras are stripped before the backend call.
	test('strips unknown fields before forwarding (mass-assignment defense)', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		// Variable indirection bypasses the object-literal excess-property
		// check to model a real attacker payload.
		const tampered = {
			...VALID_INPUT,
			userId: 'another-user',
			role: 'admin',
			permissions: ['admin:kyc:review'],
		};

		await changePassword(tampered);

		expect(mockPost).toHaveBeenCalledWith('/auth/change-password', VALID_INPUT);
	});

	test('rejects input below 12-char password policy without hitting backend', async () => {
		mockPost.mockReset();
		const result = await changePassword({
			currentPassword: 'old',
			newPassword: 'too-short',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		expect(mockPost).not.toHaveBeenCalled();
	});
});
