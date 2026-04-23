import { describe, expect, mock, test } from 'bun:test';

import { WINNING_ERROR_CODES } from '@/types/errors/winning-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { Winning } from '@/types/winning';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

const VALID_WINNING: Winning = {
	id: 'winning-1',
	raffleId: 'raffle-1',
	userId: 'user-1',
	position: 1,
	status: 'sent',
	claimType: 'shipping',
	claimedAt: '2026-01-02T00:00:00Z',
	sentAt: '2026-01-03T00:00:00Z',
	deliveredAt: null,
	receivedAt: null,
	disputedAt: null,
	resolvedAt: null,
	shippingInfo: {
		name: 'John Doe',
		address: '123 Main St',
		city: 'Springfield',
		zip: '12345',
		country: 'US',
	},
	proofUrl: 'https://tracking.com/123',
	hostNotes: 'Shipped via FedEx',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-03T00:00:00Z',
};

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
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
// All revalidation exports required — incomplete mocks contaminate other test files
mock.module('@/lib/cache/revalidation', () => ({
	revalidateMyRaffles: mock(),
	revalidateRaffleDetail: mock(),
	revalidateWinningPaths: mock(),
}));
mock.module('@/lib/utils/run-after', () => ({
	runAfter: (fn: () => void) => void fn(),
}));

const { markSent } = await import('@/services/winning/mark-sent');

describe('markSent', () => {
	test('returns validated winning on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_WINNING));

		const result = await markSent('winning-1', {
			proofUrl: 'https://tracking.com/123',
			hostNotes: 'Shipped via FedEx',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('sent');
			expect(result.data.proofUrl).toBe('https://tracking.com/123');
		}
	});

	test('returns MARK_SENT_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await markSent('winning-1', {
			proofUrl: 'https://tracking.com/123',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.MARK_SENT_FAILED);
		}
	});

	test('maps not-claimed from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:winning:not-claimed' },
			}),
		);

		const result = await markSent('winning-1', {
			proofUrl: 'https://tracking.com/123',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.NOT_CLAIMED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await markSent('winning-1', {
			proofUrl: 'https://tracking.com/123',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await markSent('winning-1', {
			proofUrl: 'https://tracking.com/123',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
