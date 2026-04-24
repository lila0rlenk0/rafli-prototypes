import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '@tests/helpers/mock-events';

// --- Fixtures ---

const RAFFLE_ID = '11111111-1111-7111-8111-111111111111';
const OPTION_ID = '22222222-2222-7222-8222-222222222222';

// --- Mocks ---

const mockPost = mock();
const mockTrackAfter = mock();
const mockCaptureContractDrift = mock();
// getSession is invoked synchronously but wrapped in Promise.resolve; the return
// value must match { user: { id } } for the analytics tag to resolve correctly
const mockGetSession = mock(() => ({ user: { id: 'user-1' } }));

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mockGetSession,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mockTrackAfter,
}));
// All event exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);

const { submitRaffleAnswer } = await import(
	'@/services/raffle/submit-raffle-answer'
);

function resetAllMocks(): void {
	mockPost.mockReset();
	mockTrackAfter.mockReset();
	mockCaptureContractDrift.mockReset();
	// Keep default impl; clear call history
	mockGetSession.mockClear();
}

// Analytics is awaited inside the service via `await trackAfter(...)`, so by
// the time `submitRaffleAnswer` resolves, the tracker has already been called.
// No microtask drain needed.

describe('submitRaffleAnswer', () => {
	describe('success', () => {
		test('returns correct=true for a matching answer', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(mockAxiosResponse({ correct: true }));

			const result = await submitRaffleAnswer(RAFFLE_ID, OPTION_ID);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.correct).toBe(true);
			}
			// Endpoint contract: optionId goes in body
			expect(mockPost).toHaveBeenCalledWith(`/raffles/${RAFFLE_ID}/answer`, {
				optionId: OPTION_ID,
			});
		});

		test('returns correct=false for a wrong answer (still success)', async () => {
			resetAllMocks();
			// Backend semantics: HTTP 200 with correct=false is a valid outcome, not an error
			mockPost.mockResolvedValueOnce(mockAxiosResponse({ correct: false }));

			const result = await submitRaffleAnswer(RAFFLE_ID, OPTION_ID);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.correct).toBe(false);
			}
		});

		test('fires QUESTION_ANSWERED analytics with correctness + raffle id', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(mockAxiosResponse({ correct: true }));

			await submitRaffleAnswer(RAFFLE_ID, OPTION_ID);

			expect(mockTrackAfter).toHaveBeenCalledTimes(1);
			expect(mockTrackAfter).toHaveBeenCalledWith(
				MOCK_ANALYTICS_EVENTS.RAFFLE_EVENTS.QUESTION_ANSWERED,
				{ raffle_id: RAFFLE_ID, correct: true },
				{ userId: 'user-1' },
			);
		});
	});

	describe('response validation failure', () => {
		test('returns FETCH_FAILED when correct field is missing', async () => {
			resetAllMocks();
			mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

			const result = await submitRaffleAnswer(RAFFLE_ID, OPTION_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
			// Analytics must NOT fire on validation failure — no confirmed answer to track
			expect(mockTrackAfter).not.toHaveBeenCalled();
		});
	});

	describe('backend RFC 7807 errors', () => {
		test('maps core:option:not-found from URN type', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: { type: 'urn:raffles:problem:core:option:not-found' },
				}),
			);

			const result = await submitRaffleAnswer(RAFFLE_ID, OPTION_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.OPTION_NOT_FOUND);
			}
			expect(mockTrackAfter).not.toHaveBeenCalled();
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			resetAllMocks();
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await submitRaffleAnswer(RAFFLE_ID, OPTION_ID);

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

			const result = await submitRaffleAnswer(RAFFLE_ID, OPTION_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});
	});
});
