import { describe, expect, mock, test } from 'bun:test';

import { WINNING_ERROR_CODES } from '@/types/errors/winning-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { Winning } from '@/types/winning';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '../../../helpers/mock-events';

const VALID_WINNING: Winning = {
	id: 'winning-1',
	raffleId: 'raffle-1',
	userId: 'user-1',
	position: 1,
	status: 'received',
	claimType: 'shipping',
	claimedAt: '2026-01-02T00:00:00Z',
	sentAt: '2026-01-03T00:00:00Z',
	deliveredAt: '2026-01-04T00:00:00Z',
	receivedAt: '2026-01-05T00:00:00Z',
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
	hostNotes: null,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-05T00:00:00Z',
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
mock.module('@/lib/run-after', () => ({
	runAfter: (fn: () => void) => void fn(),
}));

const { confirmReceived } = await import(
	'@/services/winning/confirm-received'
);

describe('confirmReceived', () => {
	test('returns validated winning on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_WINNING));

		const result = await confirmReceived('winning-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('received');
			expect(result.data.receivedAt).not.toBeNull();
		}
	});

	test('returns CONFIRM_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await confirmReceived('winning-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.CONFIRM_FAILED);
		}
	});

	test('maps invalid-status from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:winning:invalid-status' },
			}),
		);

		const result = await confirmReceived('winning-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.INVALID_STATUS);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await confirmReceived('winning-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
