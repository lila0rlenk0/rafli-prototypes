import { describe, expect, mock, test } from 'bun:test';

import { NOTIFICATION_ERROR_CODES } from '@/types/errors/notification-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { markAllNotificationsRead } = await import(
	'@/services/notification/mark-all-notifications-read'
);

describe('markAllNotificationsRead', () => {
	test('returns validated response on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ success: true }));

		const result = await markAllNotificationsRead();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.success).toBe(true);
		}
	});

	test('returns VALIDATION_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ success: 'bad' }));

		const result = await markAllNotificationsRead();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await markAllNotificationsRead();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await markAllNotificationsRead();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
