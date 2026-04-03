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
const { getAdminSubmissions } = await import(
	'@/services/admin-kyc/get-submissions'
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

const VALID_LIST_RESPONSE = {
	submissions: [
		{
			id: 'sub-1',
			type: 'kyb_individual',
			status: 'pending',
			submittedAt: '2026-04-01T12:00:00Z',
			finalizedAt: '2026-04-01T12:05:00Z',
			email: 'test@example.com',
			name: 'Test User',
			flaggedCount: 0,
		},
	],
	total: 1,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getAdminSubmissions', () => {
	describe('permission enforcement', () => {
		test('returns forbidden when session has no admin permission', async () => {
			mockGetSession.mockResolvedValueOnce(regularSession());

			const result = await getAdminSubmissions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
			expect(mockGet).not.toHaveBeenCalled();
		});

		test('returns forbidden when session is null', async () => {
			mockGetSession.mockResolvedValueOnce(null);

			const result = await getAdminSubmissions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
		});

		test('returns error when getSession throws', async () => {
			// getSession() is inside try/catch — if it throws (e.g. cookies()
			// unavailable), the error is caught and mapped to UNKNOWN_ERROR
			mockGetSession.mockRejectedValueOnce(new Error('cookies() failed'));

			const result = await getAdminSubmissions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNKNOWN_ERROR);
			}
		});
	});

	describe('successful fetch', () => {
		test('returns parsed list response', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_LIST_RESPONSE));

			const result = await getAdminSubmissions();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.submissions).toHaveLength(1);
				expect(result.data.total).toBe(1);
				expect(result.data.submissions[0].id).toBe('sub-1');
			}
		});

		test('passes query params to the API', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_LIST_RESPONSE));

			await getAdminSubmissions({ page: 2, limit: 10, status: 'pending' });

			expect(mockGet).toHaveBeenCalledWith(
				'/admin/verification',
				expect.objectContaining({
					params: { page: 2, limit: 10, status: 'pending' },
				}),
			);
		});
	});

	describe('backend errors', () => {
		test('maps RFC 7807 error', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockRejectedValueOnce(
				mockAxiosError({
					status: 403,
					data: {
						type: 'urn:raffles:problem:global:auth:unauthenticated',
					},
				}),
			);

			const result = await getAdminSubmissions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('global:auth:unauthenticated');
			}
		});

		test('maps network error', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ERR_NETWORK' }),
			);

			const result = await getAdminSubmissions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});
	});

	describe('response validation', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGetSession.mockResolvedValueOnce(adminSession());
			mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

			// Suppress console.error from ZodError logging
			const spy = spyOn(console, 'error').mockImplementation(() => {});

			const result = await getAdminSubmissions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ADMIN_KYC_ERROR_CODES.FETCH_FAILED);
			}

			spy.mockRestore();
		});
	});
});
