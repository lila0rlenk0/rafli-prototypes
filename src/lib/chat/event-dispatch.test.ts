import { describe, expect, mock, test } from 'bun:test';

import type { QueryClient } from '@tanstack/react-query';

import { dispatchChatEvent } from '@/lib/chat/event-dispatch';
import { conversationsKey, messagesKey } from '@/services/chat/query-keys';
import { createChatStore } from '@/store/chat-store';
import type { ChatServerEvent, Message, WsMessagePayload } from '@/types/chat';

// ============================================================
// Test doubles
// ============================================================

/**
 * Minimal QueryClient stand-in — we only need to observe which query keys
 * the dispatcher invalidates. Using a full QueryClient would pull in the
 * real cache machinery and hide the assertion behind a subscription.
 */
function makeFakeQueryClient() {
	const invalidateQueries = mock(async () => undefined);
	return {
		client: { invalidateQueries } as unknown as QueryClient,
		invalidateQueries,
	};
}

/** UUIDv7-ish monotonic ids so store sort order stays predictable. */
const CONVO_ID = '0194aaaa-aaaa-7aaa-aaaa-aaaaaaaaaaa1';
const OTHER_CONVO_ID = '0194aaaa-aaaa-7aaa-aaaa-aaaaaaaaaab2';
const MESSAGE_ID = '0194bbbb-bbbb-7bbb-bbbb-bbbbbbbbbbb1';
const SENDER_ID = 'user-sender';
const VIEWER_ID = 'user-viewer';

function makeWsMessage(
	overrides?: Partial<WsMessagePayload>,
): WsMessagePayload {
	return {
		body: 'hello',
		conversationId: CONVO_ID,
		createdAt: '2026-04-17T00:00:00Z',
		id: MESSAGE_ID,
		mediaType: null,
		mediaUrl: null,
		metadata: null,
		senderId: SENDER_ID,
		type: 'text',
		...overrides,
	};
}

function makeEvent(event: ChatServerEvent): ChatServerEvent {
	return event;
}

describe('dispatchChatEvent', () => {
	describe('message event — unread increment', () => {
		// Regression: incoming WS messages used to only call `upsertMessage`
		// and never touched unread counters. Until the next reconnect /
		// hydrate, the navbar badge + sidebar dots silently drifted and a
		// user with multiple conversations missed notifications entirely.
		test('increments unread for conversation when event has no tempId', () => {
			const store = createChatStore();
			const { client, invalidateQueries } = makeFakeQueryClient();
			const typingTimers = new Map();

			dispatchChatEvent(
				makeEvent({
					type: 'message',
					message: makeWsMessage({ conversationId: OTHER_CONVO_ID }),
				}),
				{ store, queryClient: client, typingTimers },
			);

			const state = store.getState();
			expect(state.unreadByConvoId[OTHER_CONVO_ID]).toBe(1);
			expect(state.unreadTotal).toBe(1);
			// Sidebar preview must refresh so the "last message" body updates.
			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: conversationsKey(),
			});
		});

		test('compounds multiple incoming messages in the same conversation', () => {
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			for (let i = 0; i < 3; i++) {
				dispatchChatEvent(
					makeEvent({
						type: 'message',
						message: makeWsMessage({
							conversationId: OTHER_CONVO_ID,
							id: `0194bbbb-bbbb-7bbb-bbbb-bbbbbbbbbbb${i}`,
						}),
					}),
					{ store, queryClient: client, typingTimers },
				);
			}

			expect(store.getState().unreadByConvoId[OTHER_CONVO_ID]).toBe(3);
			expect(store.getState().unreadTotal).toBe(3);
		});

		test('does NOT increment unread when event carries a tempId (own-send echo)', () => {
			// Own sends echo back with the tempId we submitted. Incrementing
			// on those would double-count our own messages.
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			dispatchChatEvent(
				makeEvent({
					type: 'message',
					tempId: 'temp-1',
					message: makeWsMessage({ conversationId: OTHER_CONVO_ID }),
				}),
				{ store, queryClient: client, typingTimers },
			);

			expect(store.getState().unreadByConvoId[OTHER_CONVO_ID]).toBeUndefined();
			expect(store.getState().unreadTotal).toBe(0);
		});

		test('still upserts the message body when tempId is present', () => {
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			dispatchChatEvent(
				makeEvent({
					type: 'message',
					tempId: 'temp-1',
					message: makeWsMessage({ conversationId: CONVO_ID }),
				}),
				{ store, queryClient: client, typingTimers },
			);

			const messages = store.getState().messagesByConversation[CONVO_ID] ?? [];
			expect(messages).toHaveLength(1);
			expect(messages[0].id).toBe(MESSAGE_ID);
		});

		test('drops the event when message payload is missing', () => {
			const store = createChatStore();
			const { client, invalidateQueries } = makeFakeQueryClient();
			const typingTimers = new Map();

			dispatchChatEvent(makeEvent({ type: 'message' }), {
				store,
				queryClient: client,
				typingTimers,
			});

			expect(store.getState().unreadTotal).toBe(0);
			expect(invalidateQueries).not.toHaveBeenCalled();
		});
	});

	describe('message_edited', () => {
		// Regression: edit broadcasts used to invalidate only the messages
		// query. If the edited row was the conversation's `lastMessage`, the
		// sidebar preview kept the pre-edit body — confusing at best and a
		// safety hole when a sender edits away a compromising line but the
		// sidebar still shows the original.
		test('invalidates both the messages page AND the conversations list', () => {
			const store = createChatStore();
			const { client, invalidateQueries } = makeFakeQueryClient();
			const typingTimers = new Map();

			// Seed the message so replaceMessage has a target.
			const seed: Message = {
				...makeWsMessage(),
				deletedAt: null,
				editedAt: null,
			};
			store.getState().upsertMessage(seed);

			dispatchChatEvent(
				makeEvent({
					type: 'message_edited',
					message: makeWsMessage({ body: 'edited body' }),
				}),
				{ store, queryClient: client, typingTimers },
			);

			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: messagesKey(CONVO_ID),
			});
			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: conversationsKey(),
			});
		});
	});

	describe('message_deleted', () => {
		// Regression: delete broadcasts used to soft-delete locally but never
		// invalidate React Query. The sidebar preview and any SSR-hydrated
		// messages page kept the deleted body visible until manual refresh —
		// unacceptable for moderation flows where "delete" must propagate.
		test('invalidates both the messages page AND the conversations list', () => {
			const store = createChatStore();
			const { client, invalidateQueries } = makeFakeQueryClient();
			const typingTimers = new Map();

			const seed: Message = {
				...makeWsMessage(),
				deletedAt: null,
				editedAt: null,
			};
			store.getState().upsertMessage(seed);

			dispatchChatEvent(
				makeEvent({
					type: 'message_deleted',
					conversationId: CONVO_ID,
					messageId: MESSAGE_ID,
				}),
				{ store, queryClient: client, typingTimers },
			);

			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: messagesKey(CONVO_ID),
			});
			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: conversationsKey(),
			});
			// Store was still tombstoned — local state reflects the delete.
			const row = store.getState().messagesByConversation[CONVO_ID]?.[0];
			expect(row?.body).toBeNull();
			expect(row?.deletedAt).not.toBeNull();
		});
	});

	describe('ack / error / presence / read_receipt', () => {
		test('ack resolves the pending send by tempId', () => {
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			store.getState().addPending('temp-1', CONVO_ID, 'body');
			dispatchChatEvent(makeEvent({ type: 'ack', tempId: 'temp-1' }), {
				store,
				queryClient: client,
				typingTimers,
			});

			expect(store.getState().pendingByTempId['temp-1']).toBeUndefined();
		});

		test('error with tempId marks the pending send as failed', () => {
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			store.getState().addPending('temp-1', CONVO_ID, 'body');
			dispatchChatEvent(
				makeEvent({ type: 'error', tempId: 'temp-1', code: 'rate_limited' }),
				{ store, queryClient: client, typingTimers },
			);

			const failed = store.getState().pendingByTempId['temp-1'];
			expect(failed?.status).toBe('failed');
			expect(failed?.error).toBe('rate_limited');
		});

		test('error without tempId is a no-op on pending sends', () => {
			// Session-level errors (rate limit, invalid token) carry no
			// tempId — the reconnect path handles them. Dispatcher must not
			// corrupt unrelated pending entries when `event.tempId` is absent.
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			store.getState().addPending('temp-unrelated', CONVO_ID, 'body');
			dispatchChatEvent(makeEvent({ type: 'error', code: 'rate_limited' }), {
				store,
				queryClient: client,
				typingTimers,
			});

			const stillSending = store.getState().pendingByTempId['temp-unrelated'];
			expect(stillSending?.status).toBe('sending');
		});

		test('error with unknown-format tempId defaults the code when absent', () => {
			// A server error with tempId but no code should fall back to
			// `unknown_error` so the composer can surface a non-empty label.
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			store.getState().addPending('temp-2', CONVO_ID, 'body');
			dispatchChatEvent(makeEvent({ type: 'error', tempId: 'temp-2' }), {
				store,
				queryClient: client,
				typingTimers,
			});

			expect(store.getState().pendingByTempId['temp-2']?.error).toBe(
				'unknown_error',
			);
		});

		test('presence event without userId is a no-op', () => {
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			dispatchChatEvent(makeEvent({ type: 'presence', online: true }), {
				store,
				queryClient: client,
				typingTimers,
			});

			expect(Object.keys(store.getState().presenceByUserId)).toHaveLength(0);
		});

		test('read_receipt invalidates the conversations prefix so the Unread chip stays fresh', () => {
			// Regression: self-reads used to leave the filter-chip "Unread"
			// badge stale until the next reconnect because the dispatcher
			// treated read_receipt as a pure store concern. The counts query
			// is keyed under the same `conversationsKey()` prefix, so a
			// single prefix invalidation refreshes both list rows and badges.
			const store = createChatStore();
			const { client, invalidateQueries } = makeFakeQueryClient();
			const typingTimers = new Map();

			dispatchChatEvent(makeEvent({ type: 'read_receipt' }), {
				store,
				queryClient: client,
				typingTimers,
			});

			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: conversationsKey(),
			});
		});
	});

	// Kept here (not the chat-present suite) because the decision depends on
	// whether an echo reached us first — a cross-cutting concern between
	// the dispatcher and the store.
	describe('viewer self-send detection', () => {
		test('senderId equal to viewer is not a reliable self-signal without tempId', () => {
			// Intentionally document the invariant: we use `tempId` presence
			// as the self-signal, not senderId equality, because the viewer
			// can send from another tab and the echo still carries the other
			// tab's tempId that this tab doesn't know about.
			const store = createChatStore();
			const { client } = makeFakeQueryClient();
			const typingTimers = new Map();

			dispatchChatEvent(
				makeEvent({
					type: 'message',
					// No tempId — dispatcher treats as foreign message.
					message: makeWsMessage({
						conversationId: OTHER_CONVO_ID,
						senderId: VIEWER_ID,
					}),
				}),
				{ store, queryClient: client, typingTimers },
			);

			// Even though senderId === VIEWER_ID, without tempId we increment —
			// the markReadOnLatest effect in the active conversation decrements
			// again immediately. Cross-tab flash is the documented trade-off.
			expect(store.getState().unreadByConvoId[OTHER_CONVO_ID]).toBe(1);
		});
	});
});
