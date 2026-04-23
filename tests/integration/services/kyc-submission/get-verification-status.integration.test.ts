import { describe, expect, mock, test } from 'bun:test';

import { KYC_SUBMISSION_ERROR_CODES } from '@/types/errors/kyc-submission-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { VerificationStatusResponse } from '@/types/verification-status';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const VALID_RESPONSE: VerificationStatusResponse = {
	kybIndividual: {
		status: 'approved',
		rejectionReason: null,
		submissionId: 'sub-1',
	},
	kybCompany: {
		status: 'none',
		rejectionReason: null,
		submissionId: null,
	},
	kycWinner: {
		status: 'none',
		rejectionReason: null,
		submissionId: null,
	},
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

const { getVerificationStatus } = await import(
	'@/services/kyc-submission/get-verification-status'
);

describe('getVerificationStatus', () => {
	test('returns validated verification status on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getVerificationStatus();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.kybIndividual.status).toBe('approved');
			expect(result.data.kybCompany.status).toBe('none');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await getVerificationStatus();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getVerificationStatus();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getVerificationStatus();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
