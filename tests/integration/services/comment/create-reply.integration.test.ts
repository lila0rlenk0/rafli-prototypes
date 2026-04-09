import { describe, expect, mock, test } from 'bun:test';

import { COMMENT_ERROR_CODES } from '@/types/errors/comment-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { Comment } from '@/types/comment';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '../../../helpers/mock-events';

/** Minimal valid reply — parentId is set */
const VALID_REPLY: Comment = {
	id: 'reply-1',
	author: { id: 'user-2', name: 'Replier', avatar: null },
	body: 'Nice comment!',
	parentId: 'comment-1',
	raffleId: 'raffle-1',
	isHost: false,
	isDeleted: false,
	voteScore: 0,
	userVote: null,
	replyCount: 0,
	createdAt: '2026-01-02T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
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

const { createReply } = await import('@/services/comment/create-reply');

describe('createReply', () => {
	test('returns validated reply on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_REPLY));

		const result = await createReply('raffle-1', 'comment-1', {
			body: 'Nice comment!',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe('reply-1');
			expect(result.data.parentId).toBe('comment-1');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await createReply('raffle-1', 'comment-1', {
			body: 'Test',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps parent-not-found from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:core:comment:parent-not-found' },
			}),
		);

		const result = await createReply('raffle-1', 'bad-id', { body: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.PARENT_NOT_FOUND);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await createReply('raffle-1', 'comment-1', {
			body: 'Test',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createReply('raffle-1', 'comment-1', {
			body: 'Test',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
