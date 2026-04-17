import { createStore } from 'zustand/vanilla';

import type { Message } from '@/types/chat';

/**
 * Chat store — holds real-time-driven state for the chat UI.
 *
 * All maps are kept as plain objects (not `Map`) so shallow-compare selectors
 * in Zustand trigger re-renders reliably; every mutator replaces the
 * top-level object reference.
 *
 * Capacity guards:
 *   - `MAX_MESSAGES_PER_CONVERSATION` — bounds per-conversation memory against
 *     a flooding adversary. Older messages evict via slice().
 */

/**
 * Per-conversation message cap. Primarily a flood defence — an attacker
 * spamming messages would otherwise balloon memory. 1000 is large enough
 * that user-driven pagination (20 per page × 50 pages) never evicts rows
 * the user just loaded.
 */
const MAX_MESSAGES_PER_CONVERSATION = 1_000;

export interface PendingSend {
	readonly conversationId: string;
	readonly body: string;
	readonly status: 'sending' | 'failed';
	readonly error?: string;
}

export interface ChatStoreState {
	/** True while the WS socket is in OPEN state. */
	readonly connected: boolean;
	/** Per-conversation message buffers. Sorted ascending by `createdAt` / UUIDv7 id. */
	readonly messagesByConversation: Readonly<Record<string, readonly Message[]>>;
	/** In-flight optimistic sends keyed by the client-generated `tempId`. */
	readonly pendingByTempId: Readonly<Record<string, PendingSend>>;
	/** Users currently typing per conversation (userId set). Cleared by callers. */
	readonly typingByConvoId: Readonly<
		Record<string, Readonly<Record<string, true>>>
	>;
	/** Online/offline state per user — hydrated from WS `presence` events. */
	readonly presenceByUserId: Readonly<Record<string, boolean>>;
	readonly unreadTotal: number;
	readonly unreadByConvoId: Readonly<Record<string, number>>;
}

export interface ChatStoreActions {
	readonly setConnected: (connected: boolean) => void;
	/**
	 * Inserts or updates a message. If `tempId` is supplied, the matching
	 * pending send is resolved — used during optimistic UI reconciliation.
	 */
	readonly upsertMessage: (message: Message, tempId?: string) => void;
	/** Replaces an existing message (edit) — no-op if the id isn't present. */
	readonly replaceMessage: (updated: Message) => void;
	/** Stamps a message with `deletedAt` and blanks its body — tombstone rendering. */
	readonly softDeleteMessage: (
		conversationId: string,
		messageId: string,
	) => void;
	/** Registers an outbound message as pending (optimistic UI). */
	readonly addPending: (
		tempId: string,
		conversationId: string,
		body: string,
	) => void;
	/** Marks a pending send as failed so the UI can surface a retry. */
	readonly failPending: (tempId: string, errorCode: string) => void;
	/** Clears a pending entry — used when abandoning a failed send. */
	readonly clearPending: (tempId: string) => void;
	/** Adds a typing indicator for a user in a conversation. */
	readonly setTyping: (conversationId: string, userId: string) => void;
	/** Removes a typing indicator — called on expiry timer. */
	readonly clearTyping: (conversationId: string, userId: string) => void;
	readonly setPresence: (userId: string, online: boolean) => void;
	readonly setUnreadSummary: (
		total: number,
		byConvo: Record<string, number>,
	) => void;
	/**
	 * Bumps the unread count for a conversation by one — called from the WS
	 * `message` dispatcher when a foreign message arrives. Keeps the store's
	 * badge invariant in sync without waiting for the next reconnect-time
	 * hydrate.
	 */
	readonly incrementUnread: (conversationId: string) => void;
	/** Zeros out the unread count for a conversation — called on mark-read. */
	readonly markConversationRead: (conversationId: string) => void;
	/** Clears all state — called on sign-out. */
	readonly reset: () => void;
}

export type ChatStore = ChatStoreState & ChatStoreActions;

export const defaultInitState: Readonly<ChatStoreState> = {
	connected: false,
	messagesByConversation: {},
	pendingByTempId: {},
	typingByConvoId: {},
	presenceByUserId: {},
	unreadTotal: 0,
	unreadByConvoId: {},
};

/**
 * Inserts or replaces a message while preserving ascending id order.
 *
 * Messages are stored sorted by `id` because UUIDv7 ids are
 * monotonically time-ordered — the same order the UI wants to render
 * (oldest at the top, newest at the bottom). This lets pagination
 * feeds (backwards-in-time) and WS broadcasts (forwards-in-time) mix
 * freely without a separate sort step per render.
 *
 * Capped to `MAX_MESSAGES_PER_CONVERSATION` to bound memory against a
 * flooding adversary — evicts the oldest rows so the visible window
 * always reflects the most recent activity.
 */
function mergeMessage(
	current: readonly Message[],
	incoming: Message,
): readonly Message[] {
	const existingIndex = current.findIndex(m => m.id === incoming.id);
	let next: Message[];
	if (existingIndex >= 0) {
		// Replace in place — edit/delete path. Preserves sort order because
		// the id (and therefore the position) is identical.
		next = current.slice();
		next[existingIndex] = incoming;
	} else {
		const insertIndex = current.findIndex(m => m.id > incoming.id);
		if (insertIndex === -1) {
			next = [...current, incoming];
		} else {
			next = [
				...current.slice(0, insertIndex),
				incoming,
				...current.slice(insertIndex),
			];
		}
	}

	if (next.length > MAX_MESSAGES_PER_CONVERSATION) {
		next = next.slice(next.length - MAX_MESSAGES_PER_CONVERSATION);
	}
	return next;
}

/**
 * Returns a copy of `obj` with `key` removed. Used instead of `delete` to
 * preserve immutability for Zustand shallow-compare selectors.
 */
function omit<V>(
	obj: Readonly<Record<string, V>>,
	key: string,
): Readonly<Record<string, V>> {
	if (!(key in obj)) return obj;
	// Shallow-clone then `delete` — the destructure-with-rest alternative
	// pulls in an unused binding for the extracted key, which trips the
	// zero-warning ESLint rule. `delete` on a freshly-owned clone is safe
	// and has the same observable behaviour.
	const next: Record<string, V> = { ...obj };
	delete next[key];
	return next;
}

/**
 * Vanilla store factory. The provider owns the single instance and exposes
 * it through context — same pattern as `createNotificationStore` /
 * `createUserStore`.
 *
 * @param initState - Initial state override (tests only).
 * @returns Zustand vanilla store instance.
 */
export function createChatStore(initState: ChatStoreState = defaultInitState) {
	return createStore<ChatStore>()((set, get) => ({
		...initState,

		setConnected(connected) {
			set({ connected });
		},

		upsertMessage(message, tempId) {
			const state = get();
			const current =
				state.messagesByConversation[message.conversationId] ?? [];
			const nextMessages = mergeMessage(current, message);

			const messagesByConversation = {
				...state.messagesByConversation,
				[message.conversationId]: nextMessages,
			};

			// Resolve the matching optimistic entry so the bubble flips from
			// "sending" to confirmed — identical reference would skip renders.
			const pendingByTempId =
				tempId && state.pendingByTempId[tempId]
					? omit(state.pendingByTempId, tempId)
					: state.pendingByTempId;

			set({ messagesByConversation, pendingByTempId });
		},

		replaceMessage(updated) {
			const state = get();
			const current = state.messagesByConversation[updated.conversationId];
			if (!current) return;
			const idx = current.findIndex(m => m.id === updated.id);
			if (idx < 0) return;

			const nextMessages = current.slice();
			nextMessages[idx] = updated;

			set({
				messagesByConversation: {
					...state.messagesByConversation,
					[updated.conversationId]: nextMessages,
				},
			});
		},

		softDeleteMessage(conversationId, messageId) {
			const state = get();
			const current = state.messagesByConversation[conversationId];
			if (!current) return;
			const idx = current.findIndex(m => m.id === messageId);
			if (idx < 0) return;

			// Blank the body client-side as a defensive layer in case the
			// backend ever leaks it in a future payload revision.
			const tombstoned: Message = {
				...current[idx],
				body: null,
				deletedAt: current[idx].deletedAt ?? new Date().toISOString(),
			};
			const nextMessages = current.slice();
			nextMessages[idx] = tombstoned;

			set({
				messagesByConversation: {
					...state.messagesByConversation,
					[conversationId]: nextMessages,
				},
			});
		},

		addPending(tempId, conversationId, body) {
			set(state => ({
				pendingByTempId: {
					...state.pendingByTempId,
					[tempId]: { conversationId, body, status: 'sending' },
				},
			}));
		},

		failPending(tempId, errorCode) {
			const state = get();
			const existing = state.pendingByTempId[tempId];
			if (!existing) return;
			set({
				pendingByTempId: {
					...state.pendingByTempId,
					[tempId]: { ...existing, status: 'failed', error: errorCode },
				},
			});
		},

		clearPending(tempId) {
			const state = get();
			if (!state.pendingByTempId[tempId]) return;
			set({ pendingByTempId: omit(state.pendingByTempId, tempId) });
		},

		setTyping(conversationId, userId) {
			const state = get();
			const convo = state.typingByConvoId[conversationId] ?? {};
			if (convo[userId]) return;
			set({
				typingByConvoId: {
					...state.typingByConvoId,
					[conversationId]: { ...convo, [userId]: true as const },
				},
			});
		},

		clearTyping(conversationId, userId) {
			const state = get();
			const convo = state.typingByConvoId[conversationId];
			if (!convo || !convo[userId]) return;
			const nextConvo = omit(convo, userId);
			set({
				typingByConvoId: {
					...state.typingByConvoId,
					[conversationId]: nextConvo as Readonly<Record<string, true>>,
				},
			});
		},

		setPresence(userId, online) {
			set(state => ({
				presenceByUserId: {
					...state.presenceByUserId,
					[userId]: online,
				},
			}));
		},

		setUnreadSummary(total, byConvo) {
			set({ unreadTotal: total, unreadByConvoId: { ...byConvo } });
		},

		incrementUnread(conversationId) {
			set(state => ({
				unreadTotal: state.unreadTotal + 1,
				unreadByConvoId: {
					...state.unreadByConvoId,
					[conversationId]: (state.unreadByConvoId[conversationId] ?? 0) + 1,
				},
			}));
		},

		markConversationRead(conversationId) {
			const state = get();
			const current = state.unreadByConvoId[conversationId] ?? 0;
			if (current === 0) return;
			set({
				// Guard against races where the WS event lands before the mark-read
				// response — clamp to 0.
				unreadTotal: Math.max(0, state.unreadTotal - current),
				unreadByConvoId: omit(state.unreadByConvoId, conversationId),
			});
		},

		reset() {
			set({ ...defaultInitState });
		},
	}));
}
