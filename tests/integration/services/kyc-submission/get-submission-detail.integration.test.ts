import { describe, expect, mock, test } from 'bun:test';

import { KYC_SUBMISSION_ERROR_CODES } from '@/types/errors/kyc-submission-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { KycSubmissionDetail } from '@/types/kyc-submission';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const VALID_RESPONSE: KycSubmissionDetail = {
	id: 'sub-1',
	type: 'kyb_individual',
	status: 'pending',
	data: { fullLegalName: 'John Doe', email: 'john@example.com' },
	documents: [
		{
			id: 'doc-1',
			purpose: 'id_front',
			contentType: 'image/jpeg',
			originalFilename: 'id-front.jpg',
			url: 'https://example.com/signed-url',
		},
	],
	submittedAt: '2026-01-01T00:00:00Z',
	finalizedAt: null,
	reviewedAt: null,
	rejectionReason: null,
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

const { getSubmissionDetail } = await import(
	'@/services/kyc-submission/get-submission-detail'
);

describe('getSubmissionDetail', () => {
	test('returns validated submission detail on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getSubmissionDetail('sub-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.type).toBe('kyb_individual');
			expect(result.data.documents).toHaveLength(1);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await getSubmissionDetail('sub-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps not-found from RFC 7807', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:core:verification:not-found' },
			}),
		);

		const result = await getSubmissionDetail('bad-id');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.NOT_FOUND);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getSubmissionDetail('sub-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
