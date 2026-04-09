import { describe, expect, mock, test } from 'bun:test';

import { NOTIFICATION_ERROR_CODES } from '@/types/errors/notification-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { ListNotificationsResponse } from '@/types/notification';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE: ListNotificationsResponse = {
	notifications: [
		{
			id: 'notif-1',
			userId: 'user-1',
			type: 'raffle_won',
			title: 'You won!',
			body: 'Congrats',
			read: false,
			metadata: { raffleId: 'raffle-1' },
			createdAt: '2026-01-01T00:00:00Z',
		},
	],
	total: 1,
	unreadCount: 1,
	limit: 20,
	offset: 0,
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

const { getNotifications } = await import(
	'@/services/notification/get-notifications'
);

describe('getNotifications', () => {
	test('returns validated notifications on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getNotifications();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.notifications).toHaveLength(1);
			expect(result.data.unreadCount).toBe(1);
		}
	});

	test('returns VALIDATION_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await getNotifications();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getNotifications();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getNotifications();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
