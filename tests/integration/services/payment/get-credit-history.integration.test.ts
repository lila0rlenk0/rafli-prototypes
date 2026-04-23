import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

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

const { getCreditHistory } = await import(
	'@/services/payment/get-credit-history'
);

const VALID_RESPONSE = {
	entries: [
		{
			id: 1,
			type: 'grant',
			amount: '100.0000',
			balanceAfter: '100.0000',
			reason: 'admin_grant',
			referenceId: null,
			referenceType: null,
			createdAt: '2026-04-09T10:00:00.000Z',
		},
		{
			id: 2,
			type: 'spend',
			amount: '25.0000',
			balanceAfter: '75.0000',
			reason: 'checkout_spend',
			referenceId: 'order-1',
			referenceType: 'order',
			createdAt: '2026-04-09T11:00:00.000Z',
		},
	],
	limit: 10,
	page: 1,
	total: 2,
	totalPages: 1,
};

describe('getCreditHistory', () => {
	test('returns validated credit history on valid response', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getCreditHistory({ page: 1, limit: 10 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.entries).toHaveLength(2);
			expect(result.data.entries[0].type).toBe('grant');
			expect(result.data.entries[1].type).toBe('spend');
			expect(result.data.total).toBe(2);
		}
	});

	test('works without query params (uses defaults)', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getCreditHistory();

		expect(result.success).toBe(true);
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		// Missing `entries` array — Zod parse fails
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ items: [], total: 0 }),
		);

		const result = await getCreditHistory();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('returns VALIDATION_ERROR on invalid entry type', async () => {
		// Invalid entry type — not in creditEntryTypeSchema enum
		const invalidResponse = {
			...VALID_RESPONSE,
			entries: [
				{ ...VALID_RESPONSE.entries[0], type: 'refund' },
			],
		};
		mockGet.mockResolvedValueOnce(mockAxiosResponse(invalidResponse));

		const result = await getCreditHistory();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getCreditHistory();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await getCreditHistory();

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await getCreditHistory();

		expect(result.success).toBe(false);
	});
});
