import { describe, expect, mock, test } from 'bun:test';

import { KYC_SUBMISSION_ERROR_CODES } from '@/types/errors/kyc-submission-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { MySubmissionsResponse } from '@/types/kyc-submission';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const VALID_RESPONSE: MySubmissionsResponse = {
	submissions: [
		{
			id: 'sub-1',
			type: 'kyb_individual',
			status: 'pending',
			submittedAt: '2026-01-01T00:00:00Z',
		},
	],
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
mock.module('@/lib/api/constants', () => ({
	API_TIMEOUTS: { UPLOAD: 60_000, QUERY: 10_000, MUTATION: 15_000 },
}));

const { getMySubmissions } = await import(
	'@/services/kyc-submission/get-my-submissions'
);

describe('getMySubmissions', () => {
	test('returns validated submissions on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMySubmissions();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.submissions).toHaveLength(1);
			expect(result.data.submissions[0].type).toBe('kyb_individual');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ submissions: 'bad' }));

		const result = await getMySubmissions();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getMySubmissions();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getMySubmissions();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
