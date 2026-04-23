import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const RAFFLE_ID = '11111111-1111-7111-8111-111111111111';
const VALID_RESPONSE = {
	claimId: '22222222-2222-7222-8222-222222222222',
	expiresAt: '2026-04-15T12:00:00.000Z',
	shareUrl: 'https://twitter.com/intent/tweet?text=xyz',
	token: 'share-token-abc',
};

// --- Mocks ---

const mockPost = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => ({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

const { createXShareIntent } = await import(
	'@/services/raffle/create-x-share-intent'
);

function resetAllMocks(): void {
	mockPost.mockReset();
	mockCaptureServiceError.mockReset();
	mockCaptureContractDrift.mockReset();
}

describe('createXShareIntent', () => {
	describe('success', () => {
		test('returns validated share intent payload', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

			const result = await createXShareIntent(RAFFLE_ID);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(VALID_RESPONSE);
			}
			// Endpoint contract: raffleId embedded in URL path, no body
			expect(mockPost).toHaveBeenCalledWith(
				`/raffles/${RAFFLE_ID}/x-share-intent`,
			);
		});
	});

	describe('response validation failure', () => {
		test('returns FETCH_FAILED and reports contract drift on unexpected shape', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ claimId: 42, token: null }),
			);

			const result = await createXShareIntent(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			// Contract drift is a bug signal — must reach Sentry so we catch backend API changes
			expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
			expect(mockCaptureServiceError).not.toHaveBeenCalled();
		});
	});

	describe('backend RFC 7807 errors', () => {
		test('maps core:raffle:not-found from URN type', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: { type: 'urn:raffles:problem:core:raffle:not-found' },
				}),
			);

			const result = await createXShareIntent(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.NOT_FOUND);
			}
			// Service errors must be captured — this action is on a user-triggered path
			expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await createXShareIntent(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

			const result = await createXShareIntent(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await createXShareIntent(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await createXShareIntent(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
