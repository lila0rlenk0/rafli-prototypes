import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const RAFFLE_ID = '11111111-1111-7111-8111-111111111111';
const CLAIM_ID = '22222222-2222-7222-8222-222222222222';

const VERIFIED_RESPONSE = {
	claimId: CLAIM_ID,
	reason: null,
	status: 'verified' as const,
	ticketsGranted: 1,
};

const NOT_FOUND_RESPONSE = {
	claimId: CLAIM_ID,
	reason: 'not_found' as const,
	status: 'not_found' as const,
	ticketsGranted: 0,
};

// --- Mocks ---

const mockPost = mock();
const mockRevalidateRaffleDetail = mock();
/**
 * `runAfter` wraps `after()` from next/server. In Bun tests we're outside the
 * Next.js request scope, so we intercept and invoke the task inline so the
 * revalidation assertion can observe it.
 */
const mockRunAfter = mock((task: () => void | Promise<void>) => {
	void task();
});
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));
// All revalidation exports required — incomplete mocks contaminate other test
// files (winning/) via Bun's global mock.module()
mock.module('@/lib/cache/revalidation', () => ({
	revalidateRaffleDetail: mockRevalidateRaffleDetail,
	revalidateMyRaffles: mock(),
	revalidateWinningPaths: mock(),
}));
mock.module('@/lib/utils/run-after', () => ({
	runAfter: mockRunAfter,
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => ({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

const { verifyXShare } = await import('@/services/raffle/verify-x-share');

function resetAllMocks(): void {
	mockPost.mockReset();
	mockRevalidateRaffleDetail.mockReset();
	mockRunAfter.mockClear();
	mockCaptureServiceError.mockReset();
	mockCaptureContractDrift.mockReset();
}

describe('verifyXShare', () => {
	describe('success — verified', () => {
		test('returns verification payload and revalidates raffle cache', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VERIFIED_RESPONSE));

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe('verified');
				expect(result.data.ticketsGranted).toBe(1);
			}
			expect(mockPost).toHaveBeenCalledWith(
				`/raffles/${RAFFLE_ID}/verify-x-share`,
			);
			// Verified tickets change server-rendered state — cache must be flushed
			expect(mockRunAfter).toHaveBeenCalledTimes(1);
			expect(mockRevalidateRaffleDetail).toHaveBeenCalledWith(RAFFLE_ID);
		});
	});

	describe('success — not found', () => {
		test('returns not_found payload without revalidating cache', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(mockAxiosResponse(NOT_FOUND_RESPONSE));

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe('not_found');
				expect(result.data.ticketsGranted).toBe(0);
			}
			// No tickets granted → no cache change → must not invalidate
			expect(mockRunAfter).not.toHaveBeenCalled();
			expect(mockRevalidateRaffleDetail).not.toHaveBeenCalled();
		});
	});

	describe('response validation failure', () => {
		test('returns FETCH_FAILED when status enum value is unknown', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({
					claimId: CLAIM_ID,
					reason: null,
					status: 'pending',
					ticketsGranted: 0,
				}),
			);

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
			// Validation failure must NOT trigger revalidation — no confirmed state change
			expect(mockRevalidateRaffleDetail).not.toHaveBeenCalled();
		});
	});

	describe('backend RFC 7807 errors', () => {
		test('maps core:raffle:not-found and captures for Sentry', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: { type: 'urn:raffles:problem:core:raffle:not-found' },
				}),
			);

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.NOT_FOUND);
			}
			expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});
	});
});
