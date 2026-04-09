import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { UpdateMePayload } from '@/types/user';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_UPDATE_RESPONSE = {
	id: 'user-1',
	email: 'test@example.com',
	name: 'Updated Name',
	username: 'testuser',
	image: 'https://cdn.example.com/avatars/user-1.jpg',
	bio: 'Updated bio',
};

// --- Mocks ---

const mockPut = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mock(), put: mockPut },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
mock.module('@/lib/run-after', () => ({
	runAfter: mock(),
}));
// revalidateProfile calls revalidatePath — mock next/cache
// All next/cache exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('next/cache', () => ({
	cacheLife: mock(),
	cacheTag: mock(),
	unstable_cacheLife: mock(),
	unstable_cacheTag: mock(),
	revalidatePath: mock(),
	revalidateTag: mock(),
}));

// Import AFTER mocking
const { updateMe } = await import('@/services/user/update-me');

describe('updateMe', () => {
	describe('success', () => {
		test('returns updated user data on valid partial update', async () => {
			mockPut.mockResolvedValueOnce(
				mockAxiosResponse(VALID_UPDATE_RESPONSE),
			);

			const payload: UpdateMePayload = { name: 'Updated Name' };
			const result = await updateMe(payload);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('Updated Name');
			}
		});

		test('returns updated bio', async () => {
			mockPut.mockResolvedValueOnce(
				mockAxiosResponse(VALID_UPDATE_RESPONSE),
			);

			const payload: UpdateMePayload = { bio: 'Updated bio' };
			const result = await updateMe(payload);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.bio).toBe('Updated bio');
			}
		});
	});

	describe('input validation failure', () => {
		test('returns FETCH_FAILED when name exceeds max length', async () => {
			// Name max 100 chars
			const payload: UpdateMePayload = { name: 'a'.repeat(101) };
			const result = await updateMe(payload);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});

		test('returns FETCH_FAILED when payload is empty object', async () => {
			const result = await updateMe({});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockPut.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await updateMe({ name: 'Valid Name' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPut.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await updateMe({ name: 'Valid Name' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPut.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await updateMe({ name: 'Valid Name' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPut.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await updateMe({ name: 'Valid Name' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPut.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await updateMe({ name: 'Valid Name' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
