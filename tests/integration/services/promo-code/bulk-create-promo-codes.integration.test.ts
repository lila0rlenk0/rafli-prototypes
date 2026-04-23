import { describe, expect, mock, test } from 'bun:test';

import { PROMO_CODE_ERROR_CODES } from '@/types/errors/promo-code-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { BulkCreatePromoCodesResponse } from '@/types/promo-code';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

const VALID_RESPONSE: BulkCreatePromoCodesResponse = {
	bulkId: '550e8400-e29b-71d4-a716-446655440000',
	created: 5,
	codes: ['AB23-CD45', 'EF67-GH89', 'IJ23-KL45', 'MN67-OP89', 'QR23-ST45'],
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

const { bulkCreatePromoCodes } = await import(
	'@/services/promo-code/bulk-create-promo-codes'
);

describe('bulkCreatePromoCodes', () => {
	test('returns validated response on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await bulkCreatePromoCodes('raffle-1', {
			count: 5,
			type: 'free_tickets',
			value: 3,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.created).toBe(5);
			expect(result.data.codes).toHaveLength(5);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await bulkCreatePromoCodes('raffle-1', {
			count: 5,
			type: 'free_tickets',
			value: 3,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 403 to forbidden', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

		const result = await bulkCreatePromoCodes('raffle-1', {
			count: 5,
			type: 'free_tickets',
			value: 3,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await bulkCreatePromoCodes('raffle-1', {
			count: 5,
			type: 'free_tickets',
			value: 3,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
