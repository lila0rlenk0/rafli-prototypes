import { describe, expect, mock, test } from 'bun:test';

import { CHAT_ERROR_CODES } from '@/types/errors/chat-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockDelete = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mock(),
		post: mock(),
		patch: mock(),
		delete: mockDelete,
	},
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

const { deleteMessage } = await import('@/services/chat/delete-message');

const MESSAGE_ID = '01929e55-9b1a-7c32-8ae0-0000000000ee';
const CONVERSATION_ID = '01929e55-9b1a-7c32-8ae0-0000000000bb';

// Soft-deleted message — `deletedAt` populated, `body` scrubbed to null by the
// backend. The schema accepts nullable body, so this fixture mirrors the real
// tombstone payload.
const VALID_TOMBSTONE = {
	body: null,
	conversationId: CONVERSATION_ID,
	createdAt: '2026-04-01T00:00:00Z',
	deletedAt: '2026-04-01T00:10:00Z',
	editedAt: null,
	id: MESSAGE_ID,
	mediaType: null,
	mediaUrl: null,
	metadata: null,
	senderId: '01929e55-9b1a-7c32-8ae0-0000000000aa',
	type: 'text',
};

describe('deleteMessage', () => {
	test('returns the parsed tombstone on success', async () => {
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_TOMBSTONE));

		const result = await deleteMessage(MESSAGE_ID);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe(MESSAGE_ID);
			expect(result.data.deletedAt).toBe('2026-04-01T00:10:00Z');
			expect(result.data.body).toBeNull();
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockDelete.mockResolvedValueOnce(
			// `type` invalid — enum rejection triggers Zod branch.
			mockAxiosResponse({ ...VALID_TOMBSTONE, type: 'unknown_kind' }),
		);

		const result = await deleteMessage(MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps 401 to global:auth:unauthenticated', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await deleteMessage(MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 message permission-denied URN to chat code', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:chat:message:permission-denied',
				},
			}),
		);

		const result = await deleteMessage(MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.MESSAGE_PERMISSION_DENIED);
		}
	});

	test('maps 404 message not-found URN to MESSAGE_NOT_FOUND', async () => {
		mockDelete.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:chat:message:not-found',
				},
			}),
		);

		const result = await deleteMessage(MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.MESSAGE_NOT_FOUND);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockDelete.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await deleteMessage(MESSAGE_ID);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockDelete.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await deleteMessage(MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});

	test('percent-encodes attacker-controlled messageId to block path injection', async () => {
		// Server actions are public POST endpoints; a caller can pass arbitrary strings.
		// Without encoding, `../../admin/users/target` would travel to the backend as
		// `DELETE /chat/messages/../../admin/users/target` and route to a different
		// resource on any backend that doesn't normalize RFC 3986 dot-segments.
		mockDelete.mockReset();
		mockDelete.mockResolvedValueOnce(mockAxiosResponse(VALID_TOMBSTONE));

		await deleteMessage('../../admin/users/target');

		expect(mockDelete).toHaveBeenCalledTimes(1);
		const calledUrl = mockDelete.mock.calls[0]?.[0] as string;
		// Every path-separator slash in the injected value must be encoded so
		// the backend router sees one path segment, not five. Dot chars alone
		// are harmless once the slashes disappear (`..` without `/` is literal).
		expect(calledUrl).not.toMatch(/\/\.\.\//);
		expect(calledUrl).not.toContain('/admin/');
		expect(calledUrl).toBe('/chat/messages/..%2F..%2Fadmin%2Fusers%2Ftarget');
	});
});
