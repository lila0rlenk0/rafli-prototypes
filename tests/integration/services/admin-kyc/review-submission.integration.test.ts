import { describe, expect, mock, spyOn, test } from 'bun:test';

import { ADMIN_KYC_ERROR_CODES, COMMON_ERROR_CODES } from '@/types/errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// ─── Mock Dependencies ───────────────────────────────────────────────────────

// Mock session — controls whether the caller has admin permissions
const mockGetSession = mock();

// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mockGetSession,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

// Mock API client
const mockPatch = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mock(),
		post: mock(),
		patch: mockPatch,
	},
}));

// Mock revalidatePath — server action calls this on success
const mockRevalidatePath = mock();

// All next/cache exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('next/cache', () => ({
	cacheLife: mock(),
	cacheTag: mock(),
	unstable_cacheLife: mock(),
	unstable_cacheTag: mock(),
	revalidatePath: mockRevalidatePath,
	revalidateTag: mock(),
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { reviewSubmission } = await import(
	'@/services/admin-kyc/review-submission'
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Session with admin:kyc:review permission */
function adminSession() {
	return {
		user: { permissions: ['raffle:create', 'admin:kyc:review'] },
	};
}

/** Session without admin permission */
function regularSession() {
	return {
		user: { permissions: ['raffle:create', 'raffle:participate'] },
	};
}

/** Valid review response matching adminKycReviewResponseSchema */
const VALID_REVIEW_RESPONSE = {
	id: 'sub-1',
	status: 'approved',
	reviewedAt: '2026-04-02T12:00:00Z',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('reviewSubmission', () => {
	describe('permission enforcement', () => {
		test('returns forbidden when session has no admin permission', async () => {
			mockGetSession.mockResolvedValueOnce(regularSession());

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
			// Must not reach the backend
			expect(mockPatch).not.toHaveBeenCalled();
		});

		test('returns forbidden when session is null (unauthenticated)', async () => {
			mockGetSession.mockResolvedValueOnce(null);

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
		});

		test('returns forbidden when permissions array is undefined', async () => {
			mockGetSession.mockResolvedValueOnce({ user: {} });

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
		});

		test('returns error when getSession throws', async () => {
			// getSession() is inside try/catch — if it throws (e.g. cookies()
			// unavailable), the error is caught and mapped to UNKNOWN_ERROR
			mockGetSession.mockRejectedValueOnce(new Error('cookies() failed'));

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNKNOWN_ERROR);
			}
		});
	});

	describe('input validation', () => {
		test('returns validation_error for invalid decision', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());

			const result = await reviewSubmission('sub-1', {
				decision: 'pending',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
			expect(mockPatch).not.toHaveBeenCalled();
		});

		test('returns validation_error for rejection without reason', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());

			const result = await reviewSubmission('sub-1', {
				decision: 'rejected',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
		});

		test('returns validation_error for null input', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());

			const result = await reviewSubmission('sub-1', null);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
		});

		test('returns validation_error for non-object input', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());

			const result = await reviewSubmission('sub-1', 'approved');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
		});
	});

	describe('successful review', () => {
		test('returns parsed response on approve', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockPatch.mockResolvedValueOnce(
				mockAxiosResponse(VALID_REVIEW_RESPONSE),
			);

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('sub-1');
				expect(result.data.status).toBe('approved');
			}
		});

		test('revalidates admin verification paths on success', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockPatch.mockResolvedValueOnce(
				mockAxiosResponse(VALID_REVIEW_RESPONSE),
			);
			mockRevalidatePath.mockReset();

			await reviewSubmission('sub-1', { decision: 'approved' });

			expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/verification');
			expect(mockRevalidatePath).toHaveBeenCalledWith(
				'/admin/verification/sub-1',
			);
		});
	});

	describe('backend errors', () => {
		test('maps RFC 7807 core:verification error', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockPatch.mockRejectedValueOnce(
				mockAxiosError({
					status: 409,
					data: {
						type: 'urn:raffles:problem:core:verification:already-reviewed',
					},
				}),
			);

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('core:verification:already-reviewed');
			}
		});

		test('maps network error to network_error', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockPatch.mockRejectedValueOnce(
				mockAxiosError({ code: 'ERR_NETWORK' }),
			);

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});
	});

	describe('response validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockPatch.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await reviewSubmission('sub-1', {
				decision: 'approved',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ADMIN_KYC_ERROR_CODES.FETCH_FAILED);
			}
			consoleSpy.mockRestore();
		});
	});
});
