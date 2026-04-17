import { describe, expect, mock, test } from 'bun:test';

import { CHAT_ERROR_CODES } from '@/types/errors/chat-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mockGet,
		post: mock(),
		patch: mock(),
		delete: mock(),
	},
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

const { getWinnerChat } = await import('@/services/chat/get-winner-chat');

const RAFFLE_ID = '01929e55-9b1a-7c32-8ae0-0000000000dd';

const VALID_CONVERSATION = {
	createdAt: '2026-04-01T00:00:00Z',
	createdBy: '01929e55-9b1a-7c32-8ae0-0000000000aa',
	id: '01929e55-9b1a-7c32-8ae0-0000000000bb',
	lastMessage: null,
	maxMembers: 10,
	members: [
		{
			joinedAt: '2026-04-01T00:00:00Z',
			role: 'admin',
			userId: '01929e55-9b1a-7c32-8ae0-0000000000aa',
		},
		{
			joinedAt: '2026-04-01T00:00:00Z',
			role: 'member',
			userId: '01929e55-9b1a-7c32-8ae0-0000000000cc',
		},
	],
	name: null,
	raffleId: RAFFLE_ID,
	raffleTitle: 'Vintage Watch Giveaway',
	type: 'winner_chat',
	updatedAt: '2026-04-01T00:00:00Z',
	winnerDisplayName: 'Ada Lovelace',
	winnerEmail: 'ada@example.com',
	winnerUserId: '01929e55-9b1a-7c32-8ae0-0000000000cc',
};

describe('getWinnerChat', () => {
	test('returns the parsed winner chat conversation on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_CONVERSATION));

		const result = await getWinnerChat(RAFFLE_ID);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe(VALID_CONVERSATION.id);
			expect(result.data.raffleId).toBe(RAFFLE_ID);
			expect(result.data.type).toBe('winner_chat');
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			// `maxMembers` must be number — string triggers Zod failure.
			mockAxiosResponse({ ...VALID_CONVERSATION, maxMembers: '10' }),
		);

		const result = await getWinnerChat(RAFFLE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps 401 to global:auth:unauthenticated', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await getWinnerChat(RAFFLE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 not-member URN to CONVERSATION_NOT_MEMBER', async () => {
		// Backend explicitly returns `chat:conversation:not-member` for
		// non-members on the winner-chat endpoint — the platform keeps the
		// winner list confidential by refusing to enumerate participants.
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:chat:conversation:not-member',
				},
			}),
		);

		const result = await getWinnerChat(RAFFLE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_MEMBER);
		}
	});

	test('maps 404 not-found URN to CONVERSATION_NOT_FOUND', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:chat:conversation:not-found',
				},
			}),
		);

		const result = await getWinnerChat(RAFFLE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_FOUND);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getWinnerChat(RAFFLE_ID);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getWinnerChat(RAFFLE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
