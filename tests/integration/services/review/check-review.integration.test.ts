import { describe, expect, mock, test } from 'bun:test';

import { REVIEW_ERROR_CODES } from '@/types/errors/review-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { CheckReviewResponse } from '@/types/review';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const VALID_RESPONSE: CheckReviewResponse = {
	canReview: true,
	hasReviewed: false,
	existingReview: null,
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

const { checkReview } = await import('@/services/review/check-review');

describe('checkReview', () => {
	test('returns validated eligibility on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await checkReview('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.canReview).toBe(true);
			expect(result.data.hasReviewed).toBe(false);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await checkReview('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(REVIEW_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await checkReview('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await checkReview('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
