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
 * Side-effect surface the event dispatcher writes to. Bundled so the
 * function signature stays inside the 3-param cap without losing any of
 * the fan-out targets — store mutations, React Query invalidations, and
 * the per-(convo,user) typing-indicator TTL timers all live here.
 */
export interface ChatDispatchContext {
	store: ChatStoreHandle;
	queryClient: QueryClient;
	typingTimers: Map<string, ReturnType<typeof setTimeout>>;
}

function handleMessage(event: ChatServerEvent, ctx: ChatDispatchContext) {
	if (!event.message) return;
	const actions = ctx.store.getState();
	// Step 1: Persist the message in the store. When our own optimistic
	// send echoes back, the tempId key resolves the pending entry.
	actions.upsertMessage(toMessage(event.message), event.tempId);
	// Step 2: Bump the unread counter for foreign messages. `tempId`
	// presence is the self-send discriminator — own sends echo back with
	// the tempId we submitted, and any other client's send has no tempId
	// at all. This keeps badges honest without waiting for the next
	// reconnect-time hydrate.
	if (!event.tempId) {
		actions.incrementUnread(event.message.conversationId);
	}
	// Step 3: Refresh the sidebar preview so every mounted tab catches up.
	void ctx.queryClient.invalidateQueries({ queryKey: conversationsKey() });
}

function handleAck(event: ChatServerEvent, ctx: ChatDispatchContext) {
	// Server confirms the optimistic send without sending a full message
	// payload — the `message` event will follow; the ack path is a
	// defensive resolver in case the broadcast races us.
	if (!event.tempId) return;
	ctx.store.getState().clearPending(event.tempId);
}

function handleEdited(event: ChatServerEvent, ctx: ChatDispatchContext) {
	if (!event.message) return;
	ctx.store
		.getState()
		.replaceMessage(toMessage(event.message, { edited: true }));
	void ctx.queryClient.invalidateQueries({
		queryKey: messagesKey(event.message.conversationId),
	});
	// An edit on the conversation's `lastMessage` must refresh the sidebar
	// preview — otherwise the pre-edit body lingers after a moderator
	// scrubs a compromising line.
	void ctx.queryClient.invalidateQueries({ queryKey: conversationsKey() });
}

function handleDeleted(event: ChatServerEvent, ctx: ChatDispatchContext) {
	if (!event.conversationId || !event.messageId) return;
	ctx.store.getState().softDeleteMessage(event.conversationId, event.messageId);
	// Invalidate the REST-cached pages too — stale queries would keep the
	// deleted body visible on refresh. Conversations key catches the
	// sidebar preview for the same reason.
	void ctx.queryClient.invalidateQueries({
		queryKey: messagesKey(event.conversationId),
	});
	void ctx.queryClient.invalidateQueries({ queryKey: conversationsKey() });
}

function handleTyping(event: ChatServerEvent, ctx: ChatDispatchContext) {
	if (!event.conversationId || !event.userId) return;
	const key = `${event.conversationId}:${event.userId}`;
	ctx.store.getState().setTyping(event.conversationId, event.userId);
	// Reset the expiry timer on every keystroke so a fast typist's
	// indicator doesn't flicker.
	const existing = ctx.typingTimers.get(key);
	if (existing) clearTimeout(existing);
	ctx.typingTimers.set(
		key,
		setTimeout(() => {
			const conversationId = event.conversationId;
			const userId = event.userId;
			if (conversationId && userId) {
				ctx.store.getState().clearTyping(conversationId, userId);
			}
			ctx.typingTimers.delete(key);
		}, TYPING_TTL_MS),
	);
}

function handlePresence(event: ChatServerEvent, ctx: ChatDispatchContext) {
	if (!event.userId || typeof event.online !== 'boolean') return;
	ctx.store.getState().setPresence(event.userId, event.online);
}

function handleError(event: ChatServerEvent, ctx: ChatDispatchContext) {
	// `error` carries an optional tempId so the composer can surface a
	// retry. Any error without one is a session-level issue (rate limit,
	// invalid token) already handled by the reconnect path.
	if (event.tempId) {
		ctx.store
			.getState()
			.failPending(event.tempId, event.code ?? 'unknown_error');
	}
}

function handleReadReceipt(_event: ChatServerEvent, ctx: ChatDispatchContext) {
	// Not rendered as a UI bubble in v1, but a self-read advances the read
	// cursor and the sidebar's "Unread" chip badge has to track it —
	// otherwise the chip stays stale until the next reconnect
	// (`staleTime: Infinity` everywhere else). We invalidate on every
	// read_receipt (including other members') because the dispatcher
	// doesn't hold viewer context; in the 2–5-member rooms this domain
	// produces the extra refetches are negligible.
	void ctx.queryClient.invalidateQueries({ queryKey: conversationsKey() });
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
 * @param ctx - Bundled side-effect surface (store / query client / typing timers).
 */
export function dispatchChatEvent(
	event: ChatServerEvent,
	ctx: ChatDispatchContext,
): void {
	switch (event.type) {
		case 'message':
			return handleMessage(event, ctx);
		case 'ack':
			return handleAck(event, ctx);
		case 'message_edited':
			return handleEdited(event, ctx);
		case 'message_deleted':
			return handleDeleted(event, ctx);
		case 'typing':
			return handleTyping(event, ctx);
		case 'presence':
			return handlePresence(event, ctx);
		case 'error':
			return handleError(event, ctx);
		case 'read_receipt':
			return handleReadReceipt(event, ctx);
		default:
			// Unknown type — already filtered by Zod; branch exists for `never`.
			return;
	}
}
