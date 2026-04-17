import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { QuestionsResponse } from '@/types/question';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const QUESTION_ID = '11111111-1111-7111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-7222-8222-222222222222';

const VALID_RESPONSE: QuestionsResponse = {
	questions: [
		{
			id: QUESTION_ID,
			categoryId: CATEGORY_ID,
			text: 'What is the capital of France?',
			isActive: true,
			sortOrder: 0,
			options: [
				{ id: 'opt-1', text: 'Paris', sortOrder: 0 },
				{ id: 'opt-2', text: 'London', sortOrder: 1 },
			],
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
		},
	],
	total: 1,
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

const { getQuestions } = await import('@/services/raffle/get-questions');

function resetAllMocks(): void {
	mockGet.mockReset();
	mockCaptureContractDrift.mockReset();
}

describe('getQuestions', () => {
	describe('success', () => {
		test('returns validated questions list', async () => {
			resetAllMocks();
			mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

			const result = await getQuestions();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.total).toBe(1);
				expect(result.data.questions[0].id).toBe(QUESTION_ID);
				expect(result.data.questions[0].options).toHaveLength(2);
			}
			expect(mockGet).toHaveBeenCalledWith('/questions');
		});

		test('returns empty list when backend has no active questions', async () => {
			resetAllMocks();
			// Empty-collection edge case — schema must accept empty array without error
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ questions: [], total: 0 }),
			);

			const result = await getQuestions();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.questions).toHaveLength(0);
				expect(result.data.total).toBe(0);
			}
		});
	});

	describe('response validation failure', () => {
		test('returns FETCH_FAILED and reports contract drift on missing total', async () => {
			resetAllMocks();
			mockGet.mockResolvedValueOnce(mockAxiosResponse({ questions: [] }));

			const result = await getQuestions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			resetAllMocks();
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getQuestions();

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

			const result = await getQuestions();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});
	});
});
