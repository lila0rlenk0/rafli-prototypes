import { describe, expect, mock, test } from 'bun:test';

import { PROMO_CODE_ERROR_CODES } from '@/types/errors/promo-code-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockDelete = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock(), delete: mockDelete },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { deactivatePromoCode } = await import(
	'@/services/promo-code/deactivate-promo-code'
);

describe('deactivatePromoCode', () => {
	test('returns success on valid response', async () => {
		mockDelete.mockResolvedValueOnce(mockAxiosResponse({ success: true }));

		const result = await deactivatePromoCode('promo-1');

		expect(result.success).toBe(true);
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// deactivatePromoCodeResponseSchema expects { success: true (literal) }
		mockDelete.mockResolvedValueOnce(mockAxiosResponse({ success: false }));

		const result = await deactivatePromoCode('promo-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps not-found from RFC 7807', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:core:promo:not-found' },
			}),
		);

		const result = await deactivatePromoCode('bad-id');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.NOT_FOUND);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockDelete.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await deactivatePromoCode('promo-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
