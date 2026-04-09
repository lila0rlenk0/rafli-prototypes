import { describe, expect, mock, test } from 'bun:test';

import { AUTH_ERROR_CODES } from '@/types/errors/auth-errors';

// --- Mocks ---

const mockSetAuthCookies = mock();
const mockDecodeJwt = mock();
const mockJwtPayloadToUser = mock();
const mockCaptureServiceError = mock();

mock.module('@/lib/auth/jwt', () => ({
	decodeJwt: mockDecodeJwt,
	jwtPayloadToUser: mockJwtPayloadToUser,
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(),
	setAuthCookies: mockSetAuthCookies,
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));

const { saveAuthToken } = await import('@/services/auth/save-auth-token');

/** Fake decoded JWT payload */
const MOCK_PAYLOAD = { sub: 'user-1', email: 'test@example.com' };

/** Fake user extracted from JWT */
const MOCK_USER = { id: 'user-1', email: 'test@example.com', name: 'Test' };

describe('saveAuthToken', () => {
	test('returns success when token is valid', async () => {
		mockDecodeJwt.mockReturnValueOnce(MOCK_PAYLOAD);
		mockJwtPayloadToUser.mockReturnValueOnce(MOCK_USER);

		const result = await saveAuthToken('valid-jwt-token');

		expect(result.success).toBe(true);
		expect(mockSetAuthCookies).toHaveBeenCalledWith(
			'valid-jwt-token',
			MOCK_USER,
		);
	});

	test('returns SOCIAL_TOKEN_EXCHANGE_FAILED on empty token', async () => {
		const result = await saveAuthToken('');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED,
			);
		}
	});

	test('returns SOCIAL_TOKEN_EXCHANGE_FAILED on malformed JWT', async () => {
		// decodeJwt throws on malformed tokens
		mockDecodeJwt.mockImplementationOnce(() => {
			throw new Error('Invalid JWT');
		});

		const result = await saveAuthToken('malformed-token');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED,
			);
		}
	});

	test('calls captureServiceError on decode failure', async () => {
		const decodeError = new Error('Invalid JWT');
		mockDecodeJwt.mockImplementationOnce(() => {
			throw decodeError;
		});

		await saveAuthToken('bad-token');

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			decodeError,
			AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED,
			{ service: 'auth', action: 'save-auth-token' },
		);
	});

	test('returns SOCIAL_TOKEN_EXCHANGE_FAILED when setAuthCookies fails', async () => {
		mockDecodeJwt.mockReturnValueOnce(MOCK_PAYLOAD);
		mockJwtPayloadToUser.mockReturnValueOnce(MOCK_USER);
		mockSetAuthCookies.mockRejectedValueOnce(new Error('Cookie error'));

		const result = await saveAuthToken('valid-jwt-token');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED,
			);
		}
	});
});
