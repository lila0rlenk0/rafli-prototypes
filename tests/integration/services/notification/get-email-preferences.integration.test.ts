import { describe, expect, mock, test } from 'bun:test';

import { NOTIFICATION_ERROR_CODES } from '@/types/errors/notification-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { EmailPreferences } from '@/types/email-preferences';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const VALID_RESPONSE: EmailPreferences = {
	hostNotifications: true,
	prizeUpdates: true,
	raffleLifecycle: false,
	reviewNotifications: true,
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock(), patch: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getEmailPreferences } = await import(
	'@/services/notification/get-email-preferences'
);

describe('getEmailPreferences', () => {
	test('returns validated preferences on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getEmailPreferences();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.hostNotifications).toBe(true);
			expect(result.data.raffleLifecycle).toBe(false);
		}
	});

	test('returns VALIDATION_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await getEmailPreferences();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getEmailPreferences();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getEmailPreferences();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
