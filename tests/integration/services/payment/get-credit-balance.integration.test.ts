import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));

const { getCreditBalance } = await import(
	'@/services/payment/get-credit-balance'
);

const VALID_RESPONSE = {
	availableAmount: '150.0000',
	totalGranted: '200.0000',
	totalSpent: '50.0000',
};

describe('getCreditBalance', () => {
	test('returns validated credit balance on valid response', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getCreditBalance();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.availableAmount).toBe('150.0000');
			expect(result.data.totalGranted).toBe('200.0000');
			expect(result.data.totalSpent).toBe('50.0000');
		}
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		// Missing required fields — Zod parse fails
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ balance: '100' }),
		);

		const result = await getCreditBalance();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps 401 unauthorized error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getCreditBalance();

		expect(result.success).toBe(false);
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getCreditBalance();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await getCreditBalance();

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await getCreditBalance();

		expect(result.success).toBe(false);
	});
});
