import { describe, expect, mock, test } from 'bun:test';

import { REPORT_ERROR_CODES } from '@/types/errors/report-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { UserReportResponse } from '@/types/report';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

const VALID_RESPONSE: UserReportResponse = {
	id: 'report-1',
	contentId: 'raffle-1',
	contentType: 'raffle',
	raffleId: null,
	reason: 'This raffle seems fraudulent and misleading',
	status: 'pending',
	resolvedAt: null,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
};

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
	trackAfter: mock(),
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

const { createReport } = await import('@/services/report/create-report');

describe('createReport', () => {
	test('returns validated report on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await createReport({
			contentId: 'raffle-1',
			contentType: 'raffle',
			reason: 'This raffle seems fraudulent and misleading',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe('report-1');
			expect(result.data.status).toBe('pending');
		}
	});

	test('returns VALIDATION_FAILED on invalid payload', async () => {
		// reason too short (min 10 chars) — safeParse fails before API call
		const result = await createReport({
			contentId: 'raffle-1',
			contentType: 'raffle',
			reason: 'short',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('returns VALIDATION_FAILED when raffleId missing for comment contentType', async () => {
		// Raffle-scoped content types require raffleId
		const result = await createReport({
			contentId: 'comment-1',
			contentType: 'comment',
			reason: 'This comment is inappropriate and harmful',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}
	});

	test('maps duplicate from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: { type: 'urn:raffles:problem:moderation:report:duplicate' },
			}),
		);

		const result = await createReport({
			contentId: 'raffle-1',
			contentType: 'raffle',
			reason: 'This raffle seems fraudulent and misleading',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(REPORT_ERROR_CODES.DUPLICATE);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await createReport({
			contentId: 'raffle-1',
			contentType: 'raffle',
			reason: 'This raffle seems fraudulent and misleading',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
