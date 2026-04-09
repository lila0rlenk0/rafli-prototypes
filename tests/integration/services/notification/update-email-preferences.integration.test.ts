import { describe, expect, mock, test } from 'bun:test';

import { NOTIFICATION_ERROR_CODES } from '@/types/errors/notification-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { EmailPreferences } from '@/types/email-preferences';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE: EmailPreferences = {
	hostNotifications: false,
	prizeUpdates: true,
	raffleLifecycle: true,
	reviewNotifications: false,
};

const mockPatch = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock(), patch: mockPatch },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { updateEmailPreferences } = await import(
	'@/services/notification/update-email-preferences'
);

describe('updateEmailPreferences', () => {
	test('returns validated preferences on success', async () => {
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await updateEmailPreferences({ hostNotifications: false });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.hostNotifications).toBe(false);
		}
	});

	test('returns VALIDATION_FAILED on invalid response shape', async () => {
		mockPatch.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await updateEmailPreferences({ prizeUpdates: true });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockPatch.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await updateEmailPreferences({ prizeUpdates: true });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPatch.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await updateEmailPreferences({ prizeUpdates: true });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
