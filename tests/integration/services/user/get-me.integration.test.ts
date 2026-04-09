import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_ME_RESPONSE = {
	id: 'user-1',
	email: 'test@example.com',
	emailVerified: true,
	name: 'Test User',
	username: 'testuser',
	image: 'https://cdn.example.com/avatars/user-1.jpg',
	bio: 'Hello world',
	permissions: ['host'],
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-15T00:00:00Z',
};

// --- Mocks ---

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mockGet, post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getMe } = await import('@/services/user/get-me');

describe('getMe', () => {
	describe('success', () => {
		test('returns user data with avatarUrl from image field', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_ME_RESPONSE),
			);

			const result = await getMe();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('user-1');
				expect(result.data.name).toBe('Test User');
				expect(result.data.avatarUrl).toBe(
					'https://cdn.example.com/avatars/user-1.jpg',
				);
			}
		});

		test('returns avatarUrl null when image is null', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ ...VALID_ME_RESPONSE, image: null }),
			);

			const result = await getMe();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.avatarUrl).toBeNull();
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await getMe();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getMe();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getMe();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await getMe();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getMe();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
