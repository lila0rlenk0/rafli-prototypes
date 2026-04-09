import { describe, expect, mock, test } from 'bun:test';

import { COMMENT_ERROR_CODES } from '@/types/errors/comment-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { ListCommentsResponse } from '@/types/comment';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

/** Minimal valid paginated comment list */
const VALID_RESPONSE: ListCommentsResponse = {
	items: [
		{
			id: 'comment-1',
			author: { id: 'user-1', name: 'User', avatar: null },
			body: 'Top-level comment',
			parentId: null,
			raffleId: 'raffle-1',
			isHost: false,
			isDeleted: false,
			voteScore: 5,
			userVote: null,
			replyCount: 2,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
		},
	],
	limit: 10,
	page: 1,
	total: 1,
	totalPages: 1,
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mockGet },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getComments } = await import('@/services/comment/get-comments');

describe('getComments', () => {
	test('returns validated comments on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getComments('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.total).toBe(1);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ items: 'bad' }));

		const result = await getComments('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await getComments('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getComments('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
