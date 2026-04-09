import { describe, expect, mock, test } from 'bun:test';

import { COMMENT_ERROR_CODES } from '@/types/errors/comment-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { ListCommentsResponse } from '@/types/comment';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

/** Minimal valid response — authenticated endpoint includes userVote */
const VALID_RESPONSE: ListCommentsResponse = {
	items: [
		{
			id: 'reply-1',
			author: { id: 'user-1', name: 'User', avatar: null },
			body: 'A reply',
			parentId: 'comment-1',
			raffleId: 'raffle-1',
			isHost: false,
			isDeleted: false,
			voteScore: 3,
			userVote: 'upvote',
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

const { getMyCommentReplies } = await import(
	'@/services/comment/get-my-comment-replies'
);

describe('getMyCommentReplies', () => {
	test('returns validated replies with userVote on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMyCommentReplies('raffle-1', 'comment-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items[0].userVote).toBe('upvote');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await getMyCommentReplies('raffle-1', 'comment-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getMyCommentReplies('raffle-1', 'comment-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getMyCommentReplies('raffle-1', 'comment-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
