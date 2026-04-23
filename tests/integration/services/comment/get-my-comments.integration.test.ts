import { describe, expect, mock, test } from 'bun:test';

import { COMMENT_ERROR_CODES } from '@/types/errors/comment-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { ListCommentsResponse } from '@/types/comment';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

/** Minimal valid response — authenticated endpoint includes userVote */
const VALID_RESPONSE: ListCommentsResponse = {
	items: [
		{
			id: 'comment-1',
			author: { id: 'user-1', name: 'User', avatar: null },
			body: 'My comment',
			parentId: null,
			raffleId: 'raffle-1',
			isHost: false,
			isDeleted: false,
			voteScore: 2,
			userVote: 'downvote',
			replyCount: 0,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
		},
	],
	limit: 10,
	page: 1,
	total: 1,
	totalPages: 1,
};

/**
 * Regression fixture for Sentry RAFLI-3. The backend returns `body: null`
 * for soft-deleted comments, which previously tripped `commentSchema` (it
 * required `body` to be a string) and surfaced as a ZodError contract drift
 * in production. The schema now allows null — this response must parse
 * successfully. Typed as `unknown` because we intentionally model the raw
 * JSON wire shape rather than the stricter inferred type.
 */
const RESPONSE_WITH_SOFT_DELETED_ITEM: unknown = {
	items: [
		{
			id: 'comment-1',
			author: { id: 'user-1', name: 'User', avatar: null },
			// Backend nulls the body on soft-delete rather than echoing a
			// sentinel string — this is the exact payload shape RAFLI-3 hit.
			body: null,
			parentId: null,
			raffleId: 'raffle-1',
			isHost: false,
			isDeleted: true,
			voteScore: 0,
			userVote: null,
			replyCount: 0,
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
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getMyComments } = await import('@/services/comment/get-my-comments');

describe('getMyComments', () => {
	test('returns validated comments with userVote on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMyComments('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items[0].userVote).toBe('downvote');
			expect(result.data.total).toBe(1);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ items: 'bad' }));

		const result = await getMyComments('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	// Regression for Sentry RAFLI-3. The authenticated listing is the code
	// path that produced the production ZodError (`items.N.body` expected
	// string, received null) when a soft-deleted comment landed inside a
	// page of results. The schema now accepts `body: null`; this test locks
	// the contract in place so a future "tighten the schema" change fails
	// loudly instead of breaking the browse page server action.
	test('parses soft-deleted comment with null body (Sentry RAFLI-3)', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse(RESPONSE_WITH_SOFT_DELETED_ITEM),
		);

		const result = await getMyComments('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0].body).toBeNull();
			expect(result.data.items[0].isDeleted).toBe(true);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getMyComments('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getMyComments('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
