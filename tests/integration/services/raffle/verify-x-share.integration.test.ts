import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import { X_SHARE_ERROR_CODES } from '@/types/errors/x-share-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const RAFFLE_ID = '11111111-1111-7111-8111-111111111111';
const CLAIM_ID = '22222222-2222-7222-8222-222222222222';

// Backend `VerifyXShareResponseDto` is a discriminated union under the
// lax-review policy:
//  - `verified` — terminal grant; `ticketsGranted` is always 1
//    (UNIQUE(raffleId, userId) caps abuse at one bonus per user per raffle).
//  - `pending_review` — non-terminal; X's recent-search index hasn't picked
//    the tweet up yet. The user retries after `retryAfterSeconds`; once
//    `attemptsRemaining` hits zero, the next call grants blind.
const VERIFIED_RESPONSE = {
	claimId: CLAIM_ID,
	status: 'verified' as const,
	ticketsGranted: 1,
};

const PENDING_REVIEW_RESPONSE = {
	attemptsRemaining: 2,
	claimId: CLAIM_ID,
	retryAfterSeconds: 30,
	status: 'pending_review' as const,
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
	// Mirror the real `createRequest` shape: a thin wrapper that forwards to
	// the underlying client and folds the custom timeout into the request
	// config. Forwarding to `client.post` keeps `mockPost` as the single
	// observation point so call-signature assertions still work.
	createRequest: (client: { post: typeof mockPost }, timeout?: number) => ({
		post: (url: string, data?: unknown, config?: Record<string, unknown>) =>
			client.post(url, data, {
				...config,
				timeout: timeout ?? config?.timeout,
			}),
	}),
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
			// Discriminated union — narrow on `status` before reading the
			// branch-specific `ticketsGranted` field.
			if (result.success && result.data.status === 'verified') {
				expect(result.data.ticketsGranted).toBe(1);
			}
			// `createRequest(client, 12_000)` wraps `post(url)` into
			// `client.post(url, undefined, { timeout: 12_000 })` — the action
			// uses the tighter timeout to keep slow X recent-search lookups
			// from climbing into Vercel's 30s edge cap.
			expect(mockPost).toHaveBeenCalledWith(
				`/raffles/${RAFFLE_ID}/verify-x-share`,
				undefined,
				{ timeout: 12_000 },
			);
			// Verified tickets change server-rendered state — cache must be flushed
			expect(mockRunAfter).toHaveBeenCalledTimes(1);
			expect(mockRevalidateRaffleDetail).toHaveBeenCalledWith(RAFFLE_ID);
		});
	});

	describe('success — pending_review (lax-review deferred)', () => {
		test('returns deferred payload and SKIPS revalidation', async () => {
			// Lax-review branch: backend hasn't seen the tweet in X's recent-search
			// index yet, so the claim row is untouched. Revalidating the raffle
			// detail cache here would be a wasted RSC re-render — assert it's
			// skipped so the optimization can't regress silently.
			resetAllMocks();
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(PENDING_REVIEW_RESPONSE),
			);

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(true);
			if (result.success && result.data.status === 'pending_review') {
				expect(result.data.attemptsRemaining).toBe(2);
				expect(result.data.retryAfterSeconds).toBe(30);
			}
			// No ticket grant, no cache invalidation — the claim row is unchanged.
			expect(mockRunAfter).not.toHaveBeenCalled();
			expect(mockRevalidateRaffleDetail).not.toHaveBeenCalled();
		});

		test('honours zero remaining attempts on the boundary', async () => {
			// `attemptsRemaining: 0` is the contract's boundary — the next call
			// will grant blind. Schema accepts it via `nonnegative()`; lock that
			// in so a future tightening to `positive()` doesn't silently break
			// the last-retry render path.
			resetAllMocks();
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({
					...PENDING_REVIEW_RESPONSE,
					attemptsRemaining: 0,
				}),
			);

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(true);
			if (result.success && result.data.status === 'pending_review') {
				expect(result.data.attemptsRemaining).toBe(0);
			}
		});
	});

	describe('response validation failure', () => {
		test('returns FETCH_FAILED when status is outside the discriminated union', async () => {
			// Status is constrained to `'verified' | 'pending_review'` under the
			// lax-review policy. Anything else (legacy `'not_found'`, stale
			// `'pending'`, new value) is a contract drift signal — surface it to
			// Sentry and bail rather than rendering on a status the UI can't reason
			// about.
			resetAllMocks();
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({
					claimId: CLAIM_ID,
					status: 'not_found',
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

		test('returns FETCH_FAILED when ticketsGranted is not a positive integer', async () => {
			// A verified response means the backend granted at least one whole
			// ticket. Accepting zero, negative, or fractional grants would refresh
			// the UI into a "verified" state without a usable ledger change.
			resetAllMocks();
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({
					claimId: CLAIM_ID,
					status: 'verified',
					ticketsGranted: 0,
				}),
			);

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
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

		test('maps core:xshare:expired through the dedicated X-share union', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 409,
					data: { type: 'urn:raffles:problem:core:xshare:expired' },
				}),
			);

			const result = await verifyXShare(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(X_SHARE_ERROR_CODES.EXPIRED);
			}
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
