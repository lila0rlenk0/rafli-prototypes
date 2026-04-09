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

const { getWsToken } = await import('@/services/notification/get-ws-token');

describe('getWsToken', () => {
	test('returns validated token on success', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ token: 'ws-token-abc', expiresIn: 300 }),
		);

		const result = await getWsToken();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.token).toBe('ws-token-abc');
			expect(result.data.expiresIn).toBe(300);
		}
	});

	test('returns VALIDATION_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ token: 123 }));

		const result = await getWsToken();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getWsToken();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getWsToken();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
