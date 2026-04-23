import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { KYC_SUBMISSION_ERROR_CODES } from '@/types/errors/kyc-submission-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All event exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: () => null,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/api/constants', () => ({
	API_TIMEOUTS: { UPLOAD: 60_000, QUERY: 10_000, MUTATION: 15_000 },
}));

const { finalizeSubmission } = await import(
	'@/services/kyc-submission/finalize-submission'
);

describe('finalizeSubmission', () => {
	test('returns success on valid finalization', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(undefined));

		const result = await finalizeSubmission('submission-1');

		expect(result.success).toBe(true);
	});

	test('maps already-finalized from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:verification:already-finalized' },
			}),
		);

		const result = await finalizeSubmission('submission-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.ALREADY_FINALIZED);
		}
	});

	test('maps incomplete-documents from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:verification:incomplete-documents' },
			}),
		);

		const result = await finalizeSubmission('submission-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.INCOMPLETE_DOCUMENTS);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await finalizeSubmission('submission-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await finalizeSubmission('submission-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
