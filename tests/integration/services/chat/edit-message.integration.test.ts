import { describe, expect, mock, test } from 'bun:test';

import { CHAT_ERROR_CODES } from '@/types/errors/chat-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPatch = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mock(),
		post: mock(),
		patch: mockPatch,
		delete: mock(),
	},
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

const { editMessage } = await import('@/services/chat/edit-message');

const MESSAGE_ID = '01929e55-9b1a-7c32-8ae0-0000000000ee';
const CONVERSATION_ID = '01929e55-9b1a-7c32-8ae0-0000000000bb';

const VALID_MESSAGE = {
	body: 'edited',
	conversationId: CONVERSATION_ID,
	createdAt: '2026-04-01T00:00:00Z',
	deletedAt: null,
	editedAt: '2026-04-01T00:05:00Z',
	id: MESSAGE_ID,
	mediaType: null,
	mediaUrl: null,
	metadata: null,
	senderId: '01929e55-9b1a-7c32-8ae0-0000000000aa',
	type: 'text',
};

describe('editMessage', () => {
	test('returns the parsed updated message on success', async () => {
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(VALID_MESSAGE));

		const result = await editMessage(MESSAGE_ID, { body: 'edited' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.body).toBe('edited');
			expect(result.data.editedAt).toBe('2026-04-01T00:05:00Z');
		}
	});

	test('returns MESSAGE_INVALID_BODY for empty body without hitting the network', async () => {
		// The safeParse guard at the top of `editMessage` rejects before the
		// PATCH request is issued — regression-guard the no-network contract.
		mockPatch.mockReset();

		const result = await editMessage(MESSAGE_ID, { body: '' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.MESSAGE_INVALID_BODY);
		}
		expect(mockPatch).not.toHaveBeenCalled();
	});

	test('returns VALIDATION_FAILED and captures contract drift on response shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockPatch.mockResolvedValueOnce(
			// `type` invalid — enum rejection triggers Zod branch.
			mockAxiosResponse({ ...VALID_MESSAGE, type: 'unknown_kind' }),
		);

		const result = await editMessage(MESSAGE_ID, { body: 'edited' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps 401 to global:auth:unauthenticated', async () => {
		mockPatch.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await editMessage(MESSAGE_ID, { body: 'edited' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 message permission-denied URN to chat code', async () => {
		mockPatch.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:chat:message:permission-denied',
				},
			}),
		);

		const result = await editMessage(MESSAGE_ID, { body: 'edited' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.MESSAGE_PERMISSION_DENIED);
		}
	});

	test('maps 404 message not-found URN to MESSAGE_NOT_FOUND', async () => {
		mockPatch.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:chat:message:not-found',
				},
			}),
		);

		const result = await editMessage(MESSAGE_ID, { body: 'edited' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.MESSAGE_NOT_FOUND);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPatch.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await editMessage(MESSAGE_ID, { body: 'edited' });

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockPatch.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await editMessage(MESSAGE_ID, { body: 'edited' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
