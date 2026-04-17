import type { QueryClient } from '@tanstack/react-query';

import { conversationsKey, messagesKey } from '@/services/chat/query-keys';
import type { createChatStore } from '@/store/chat-store';
import type { ChatServerEvent, Message, WsMessagePayload } from '@/types/chat';

/**
 * Handle to the vanilla Zustand chat store — declared here (not re-imported
 * from the provider) so this module can be unit-tested without dragging in
 * the React-only provider tree.
 */
type ChatStoreHandle = ReturnType<typeof createChatStore>;

/**
 * Backend auto-expires typing presence at 3s; match client-side so stale
 * indicators disappear even if we miss the eventual `typing` broadcast.
 */
const TYPING_TTL_MS = 3_000;

/**
 * Normalizes a WS message payload into the full `Message` shape stored
 * client-side. The backend's WsMessageDto intentionally omits `deletedAt`
 * and `editedAt` — we synthesize them so the store type stays uniform
 * whether a message arrived via REST or WS. `editedAt` is stamped with
 * "now" on `message_edited` broadcasts because the backend delivers no
 * authoritative timestamp and the only consumer is a relative-time label.
 */
function toMessage(
	payload: WsMessagePayload,
	options?: { edited?: boolean },
): Message {
	const editedAt = options?.edited ? new Date().toISOString() : null;
	return {
		...payload,
		deletedAt: null,
		editedAt,
	};
}

/**
 * Routes a validated server event into the store and — where the React
 * Query cache also needs to bust — a targeted invalidation.
 *
 * Extracted from the provider so the fan-out logic is unit-testable
 * without a React render. The provider stays a one-screen snapshot of
 * the WS lifecycle and delegates per-event state transitions here.
 *
 * @param event - Validated WS frame (already parsed by `chatServerEventSchema`).
 * @param store - Vanilla Zustand store instance for the chat surface.
 * @param queryClient - Active React Query client for targeted invalidations.
 * @param typingTimers - Shared Map tracking the per-(convo,user) typing TTL timer.
 */
export function dispatchChatEvent(
	event: ChatServerEvent,
	store: ChatStoreHandle,
	queryClient: QueryClient,
	typingTimers: Map<string, ReturnType<typeof setTimeout>>,
): void {
	const actions = store.getState();

	switch (event.type) {
		case 'message': {
			// Step 1: Persist the message in the store. When our own optimistic
			// send echoes back, the tempId key resolves the pending entry.
			if (!event.message) return;
			actions.upsertMessage(toMessage(event.message), event.tempId);

			// Step 2: Bump the unread counter for foreign messages. `tempId`
			// presence is the self-send discriminator — own sends echo back
			// with the tempId we submitted, and any other client's send has no
			// tempId at all. This keeps badges honest without waiting for the
			// next reconnect-time hydrate.
			if (!event.tempId) {
				actions.incrementUnread(event.message.conversationId);
			}

			// Step 3: Refresh the sidebar preview so every mounted tab catches up.
			void queryClient.invalidateQueries({ queryKey: conversationsKey() });
			return;
		}
		case 'ack': {
			// Server confirms the optimistic send without sending a full
			// message payload — the `message` event will follow; we keep the
			// ack path as a defensive resolver in case the broadcast races us.
			if (!event.tempId) return;
			actions.clearPending(event.tempId);
			return;
		}
		case 'message_edited': {
			if (!event.message) return;
			actions.replaceMessage(toMessage(event.message, { edited: true }));
			void queryClient.invalidateQueries({
				queryKey: messagesKey(event.message.conversationId),
			});
			// An edit on the conversation's `lastMessage` must refresh the
			// sidebar preview — otherwise the pre-edit body lingers after a
			// moderator scrubs a compromising line.
			void queryClient.invalidateQueries({ queryKey: conversationsKey() });
			return;
		}
		case 'message_deleted': {
			if (!event.conversationId || !event.messageId) return;
			actions.softDeleteMessage(event.conversationId, event.messageId);
			// Invalidate the REST-cached pages too — stale queries would keep
			// the deleted body visible on refresh. Conversations key catches
			// the sidebar preview for the same reason.
			void queryClient.invalidateQueries({
				queryKey: messagesKey(event.conversationId),
			});
			void queryClient.invalidateQueries({ queryKey: conversationsKey() });
			return;
		}
		case 'typing': {
			if (!event.conversationId || !event.userId) return;
			const key = `${event.conversationId}:${event.userId}`;
			actions.setTyping(event.conversationId, event.userId);
			// Reset the expiry timer on every keystroke so a fast typist's
			// indicator doesn't flicker.
			const existing = typingTimers.get(key);
			if (existing) clearTimeout(existing);
			typingTimers.set(
				key,
				setTimeout(() => {
					const conversationId = event.conversationId;
					const userId = event.userId;
					if (conversationId && userId) {
						store.getState().clearTyping(conversationId, userId);
					}
					typingTimers.delete(key);
				}, TYPING_TTL_MS),
			);
			return;
		}
		case 'presence': {
			if (!event.userId || typeof event.online !== 'boolean') return;
			actions.setPresence(event.userId, event.online);
			return;
		}
		case 'error': {
			// `error` carries an optional tempId so the composer can surface a
			// retry. Any error without one is a session-level issue (rate
			// limit, invalid token) already handled by the reconnect path.
			if (event.tempId) {
				actions.failPending(event.tempId, event.code ?? 'unknown_error');
			}
			return;
		}
		case 'read_receipt': {
			// Read receipts are backend-broadcast but not rendered in v1 —
			// intentionally no-op so the switch stays exhaustive.
			return;
		}
		default: {
			// Unknown type — already filtered by Zod; branch exists for `never`.
			return;
		}
	}
}
