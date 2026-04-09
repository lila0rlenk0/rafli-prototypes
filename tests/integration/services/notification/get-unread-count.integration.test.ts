import { describe, expect, mock, test } from 'bun:test';

import { NOTIFICATION_ERROR_CODES } from '@/types/errors/notification-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getUnreadCount } = await import(
	'@/services/notification/get-unread-count'
);

describe('getUnreadCount', () => {
	test('returns validated count on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ count: 5 }));

		const result = await getUnreadCount();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.count).toBe(5);
		}
	});

	test('returns VALIDATION_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ count: 'bad' }));

		const result = await getUnreadCount();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getUnreadCount();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getUnreadCount();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
