import { describe, expect, mock, test } from 'bun:test';

import { CHAT_ERROR_CODES } from '@/types/errors/chat-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

// `server-only` throws at import time in test environments because there's no
// React Server Component runtime — stub it so server action modules can load.
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

const { getConversations } = await import(
	'@/services/chat/get-conversations'
);

// UUIDv7-shaped id kept as a string — Zod schema uses `z.string()` but realistic
// ids guard the fixtures if the schema ever tightens to `z.uuidv7()`.
const VALID_CONVERSATION = {
	createdAt: '2026-04-01T00:00:00Z',
	createdBy: '01929e55-9b1a-7c32-8ae0-0000000000aa',
	id: '01929e55-9b1a-7c32-8ae0-0000000000bb',
	lastMessage: null,
	maxMembers: 10,
	memberCount: 2,
	rosterMembers: [
		{
			displayName: 'Host User',
			joinedAt: '2026-04-01T00:00:00Z',
			role: 'admin',
			userId: '01929e55-9b1a-7c32-8ae0-0000000000aa',
		},
		{
			displayName: 'Ada Lovelace',
			joinedAt: '2026-04-01T00:00:00Z',
			role: 'member',
			userId: '01929e55-9b1a-7c32-8ae0-0000000000cc',
		},
	],
	name: null,
	raffleId: '01929e55-9b1a-7c32-8ae0-0000000000dd',
	raffleTitle: 'Vintage Watch Giveaway',
	type: 'winner_chat',
	updatedAt: '2026-04-01T00:00:00Z',
	winnerDisplayName: 'Ada Lovelace',
	winnerEmail: 'ada@example.com',
	winnerUserId: '01929e55-9b1a-7c32-8ae0-0000000000cc',
};

const VALID_RESPONSE = {
	conversations: [VALID_CONVERSATION],
	hasMore: false,
};

describe('getConversations', () => {
	test('returns the parsed conversation page on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getConversations();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.conversations).toHaveLength(1);
			expect(result.data.hasMore).toBe(false);
			expect(result.data.conversations[0]?.id).toBe(VALID_CONVERSATION.id);
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			// `hasMore` missing — Zod parse fails.
			mockAxiosResponse({ conversations: [VALID_CONVERSATION] }),
		);

		const result = await getConversations();

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

		const result = await getConversations();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 with permission-denied URN to chat code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:chat:conversation:permission-denied',
				},
			}),
		);

		const result = await getConversations();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				CHAT_ERROR_CODES.CONVERSATION_PERMISSION_DENIED,
			);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getConversations();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getConversations();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
