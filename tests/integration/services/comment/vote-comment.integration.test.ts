import { describe, expect, mock, test } from 'bun:test';

import { COMMENT_ERROR_CODES } from '@/types/errors/comment-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { VoteResponse } from '@/types/comment';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

/** Minimal valid vote response */
const VALID_RESPONSE: VoteResponse = {
	commentId: 'comment-1',
	voteScore: 5,
	voteType: 'upvote',
};

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost, delete: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All event exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: () => null,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

const { voteComment } = await import('@/services/comment/vote-comment');

describe('voteComment', () => {
	test('returns validated vote response on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await voteComment('comment-1', 'upvote');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.voteScore).toBe(5);
			expect(result.data.voteType).toBe('upvote');
		}
	});

	test('handles vote toggle — voteType null when toggled off', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ commentId: 'comment-1', voteScore: 4, voteType: null }),
		);

		const result = await voteComment('comment-1', 'upvote');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.voteType).toBeNull();
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await voteComment('comment-1', 'upvote');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps self-vote from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:comment:self-vote' },
			}),
		);

		const result = await voteComment('comment-1', 'upvote');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.SELF_VOTE);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await voteComment('comment-1', 'downvote');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await voteComment('comment-1', 'downvote');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
