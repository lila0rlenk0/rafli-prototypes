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

const { getConversation } = await import('@/services/chat/get-conversation');

const CONVERSATION_ID = '01929e55-9b1a-7c32-8ae0-0000000000bb';

const VALID_CONVERSATION = {
	createdAt: '2026-04-01T00:00:00Z',
	createdBy: '01929e55-9b1a-7c32-8ae0-0000000000aa',
	id: CONVERSATION_ID,
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
	raffleId: '01929e55-9b1a-7c32-8ae0-0000000000dd',
	type: 'winner_chat',
	updatedAt: '2026-04-01T00:00:00Z',
	winnerUserId: '01929e55-9b1a-7c32-8ae0-0000000000cc',
};

describe('getConversation', () => {
	test('returns the parsed conversation on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_CONVERSATION));

		const result = await getConversation(CONVERSATION_ID);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe(CONVERSATION_ID);
			expect(result.data.type).toBe('winner_chat');
			expect(result.data.members).toHaveLength(2);
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			// `type` field is invalid — enum rejection triggers the Zod branch.
			mockAxiosResponse({ ...VALID_CONVERSATION, type: 'unknown_kind' }),
		);

		const result = await getConversation(CONVERSATION_ID);

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

		const result = await getConversation(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 not-member URN to chat code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:chat:conversation:not-member',
				},
			}),
		);

		const result = await getConversation(CONVERSATION_ID);

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

		const result = await getConversation(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_FOUND);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getConversation(CONVERSATION_ID);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getConversation(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
