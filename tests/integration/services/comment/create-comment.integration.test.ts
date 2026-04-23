import { describe, expect, mock, test } from 'bun:test';

import { COMMENT_ERROR_CODES } from '@/types/errors/comment-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { Comment } from '@/types/comment';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

/** Minimal valid comment matching commentSchema */
const VALID_COMMENT: Comment = {
	id: 'comment-1',
	author: { id: 'user-1', name: 'Test User', avatar: null },
	body: 'Great raffle!',
	parentId: null,
	raffleId: 'raffle-1',
	isHost: false,
	isDeleted: false,
	voteScore: 0,
	userVote: null,
	replyCount: 0,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
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
	trackAfter: mock(),
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

const { createComment } = await import('@/services/comment/create-comment');

describe('createComment', () => {
	test('returns validated comment on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_COMMENT));

		const result = await createComment('raffle-1', { body: 'Great raffle!' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe('comment-1');
			expect(result.data.body).toBe('Great raffle!');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ id: 123 }));

		const result = await createComment('raffle-1', { body: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps RFC 7807 permission-denied error', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: { type: 'urn:raffles:problem:core:comment:permission-denied' },
			}),
		);

		const result = await createComment('raffle-1', { body: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.PERMISSION_DENIED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await createComment('raffle-1', { body: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await createComment('raffle-1', { body: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createComment('raffle-1', { body: 'Test' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
