import { describe, expect, mock, spyOn, test } from 'bun:test';

import { ADMIN_KYC_ERROR_CODES, COMMON_ERROR_CODES } from '@/types/errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// ─── Mock Dependencies ───────────────────────────────────────────────────────

const mockGetSession = mock();

mock.module('@/lib/auth/session', () => ({
	getSession: mockGetSession,
}));

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mockGet,
		post: mock(),
		patch: mock(),
	},
}));

mock.module('next/cache', () => ({
	revalidatePath: mock(),
}));

mock.module('@/lib/sentry/capture', () => ({
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getSubmissionDetail } = await import(
	'@/services/admin-kyc/get-submission-detail'
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adminSession() {
	return {
		user: { permissions: ['raffle:create', 'admin:kyc:review'] },
	};
}

function regularSession() {
	return {
		user: { permissions: ['raffle:create', 'raffle:participate'] },
	};
}

const VALID_DETAIL_RESPONSE = {
	id: 'sub-1',
	userId: 'user-1',
	userName: 'Test User',
	userEmail: 'test@example.com',
	type: 'kyb_individual',
	status: 'pending',
	data: { fullLegalName: 'Test User', email: 'test@example.com' },
	documents: [],
	screenings: [],
	submittedAt: '2026-04-01T12:00:00Z',
	finalizedAt: '2026-04-01T12:05:00Z',
	reviewedAt: null,
	reviewedBy: null,
	rejectionReason: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getSubmissionDetail', () => {
	describe('permission enforcement', () => {
		test('returns forbidden when session has no admin permission', async () => {
			mockGetSession.mockResolvedValueOnce(regularSession());

			const result = await getSubmissionDetail('sub-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
			expect(mockGet).not.toHaveBeenCalled();
		});

		test('returns forbidden when session is null', async () => {
			mockGetSession.mockResolvedValueOnce(null);

			const result = await getSubmissionDetail('sub-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
		});

		test('returns error when getSession throws', async () => {
			// getSession() is inside try/catch — if it throws (e.g. cookies()
			// unavailable), the error is caught and mapped to UNKNOWN_ERROR
			mockGetSession.mockRejectedValueOnce(new Error('cookies() failed'));

			const result = await getSubmissionDetail('sub-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNKNOWN_ERROR);
			}
		});
	});

	describe('successful fetch', () => {
		test('returns parsed detail response', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_DETAIL_RESPONSE),
			);

			const result = await getSubmissionDetail('sub-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('sub-1');
				expect(result.data.type).toBe('kyb_individual');
				expect(result.data.userEmail).toBe('test@example.com');
			}
		});

		test('passes submission ID to the API path', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_DETAIL_RESPONSE),
			);

			await getSubmissionDetail('abc-123');

			expect(mockGet).toHaveBeenCalledWith(
				'/admin/verification/abc-123',
				expect.objectContaining({}),
			);
		});
	});

	describe('backend errors', () => {
		test('maps not-found error', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: {
						type: 'urn:raffles:problem:core:verification:not-found',
					},
				}),
			);

			const result = await getSubmissionDetail('sub-999');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('core:verification:not-found');
			}
		});

		test('maps network error', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getSubmissionDetail('sub-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('response validation', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ not: 'a valid detail' }),
			);

			const spy = spyOn(console, 'error').mockImplementation(() => {});

			const result = await getSubmissionDetail('sub-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ADMIN_KYC_ERROR_CODES.FETCH_FAILED);
			}

			spy.mockRestore();
		});
	});
});
