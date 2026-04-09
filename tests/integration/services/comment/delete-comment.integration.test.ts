import { describe, expect, mock, test } from 'bun:test';

import { COMMENT_ERROR_CODES } from '@/types/errors/comment-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockDelete = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock(), delete: mockDelete },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { deleteComment } = await import('@/services/comment/delete-comment');

describe('deleteComment', () => {
	test('returns success on valid response', async () => {
		mockDelete.mockResolvedValueOnce(
			mockAxiosResponse({ success: true }),
		);

		const result = await deleteComment('comment-1');

		expect(result.success).toBe(true);
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// deleteCommentResponseSchema expects { success: true (literal) }
		mockDelete.mockResolvedValueOnce(
			mockAxiosResponse({ success: false }),
		);

		const result = await deleteComment('comment-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps already-deleted from RFC 7807', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: { type: 'urn:raffles:problem:core:comment:already-deleted' },
			}),
		);

		const result = await deleteComment('comment-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMENT_ERROR_CODES.ALREADY_DELETED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockDelete.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await deleteComment('comment-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockDelete.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await deleteComment('comment-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
