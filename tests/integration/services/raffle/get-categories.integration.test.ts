import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_CATEGORIES_RESPONSE = {
	categories: [
		{
			id: 'cat-1',
			name: 'Electronics',
			slug: 'electronics',
			description: 'Electronic devices',
			isActive: true,
			sortOrder: 1,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
		},
		{
			id: 'cat-2',
			name: 'Fashion',
			slug: 'fashion',
			description: null,
			isActive: true,
			sortOrder: 2,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
		},
	],
	total: 2,
};

// --- Mocks ---

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mockGet },
	authenticatedClient: { get: mock(), post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getCategories } = await import('@/services/raffle/get-categories');

describe('getCategories', () => {
	describe('success', () => {
		test('returns validated categories on valid response', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_CATEGORIES_RESPONSE),
			);

			const result = await getCategories();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.categories).toHaveLength(2);
				expect(result.data.total).toBe(2);
				expect(result.data.categories[0].name).toBe('Electronics');
			}
		});

		test('returns empty categories list', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ categories: [], total: 0 }),
			);

			const result = await getCategories();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.categories).toHaveLength(0);
				expect(result.data.total).toBe(0);
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await getCategories();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getCategories();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getCategories();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getCategories();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
