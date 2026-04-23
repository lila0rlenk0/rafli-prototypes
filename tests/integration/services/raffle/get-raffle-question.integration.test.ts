import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { RaffleQuestion } from '@/types/raffle-question';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const RAFFLE_ID = '11111111-1111-7111-8111-111111111111';
const QUESTION_ID = '22222222-2222-7222-8222-222222222222';

const VALID_RESPONSE: RaffleQuestion = {
	questionId: QUESTION_ID,
	text: 'What is the capital of France?',
	options: [
		{ id: 'opt-1', text: 'Paris', sortOrder: 0 },
		{ id: 'opt-2', text: 'London', sortOrder: 1 },
	],
};

// --- Mocks ---

const mockGet = mock();
const mockCaptureContractDrift = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mockGet, post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mock(),
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

const { getRaffleQuestion } = await import(
	'@/services/raffle/get-raffle-question'
);

function resetAllMocks(): void {
	mockGet.mockReset();
	mockCaptureContractDrift.mockReset();
}

describe('getRaffleQuestion', () => {
	describe('success', () => {
		test('returns validated question with options', async () => {
			resetAllMocks();
			mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

			const result = await getRaffleQuestion(RAFFLE_ID);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.questionId).toBe(QUESTION_ID);
				expect(result.data.options).toHaveLength(2);
			}
			expect(mockGet).toHaveBeenCalledWith(`/raffles/${RAFFLE_ID}/question`);
		});
	});

	describe('response validation failure', () => {
		test('returns FETCH_FAILED and reports contract drift when options missing', async () => {
			resetAllMocks();
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ questionId: QUESTION_ID, text: 'x' }),
			);

			const result = await getRaffleQuestion(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
		});
	});

	describe('backend RFC 7807 errors', () => {
		test('maps core:raffle:question-not-found from URN type', async () => {
			resetAllMocks();
			mockGet.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: {
						type: 'urn:raffles:problem:core:raffle:question-not-found',
					},
				}),
			);

			const result = await getRaffleQuestion(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.QUESTION_NOT_FOUND);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			resetAllMocks();
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getRaffleQuestion(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			resetAllMocks();
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await getRaffleQuestion(RAFFLE_ID);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});
	});
});
