'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
	createContext,
	use,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { useStore } from 'zustand';

import { clientEnv } from '@/env/client';
import { dispatchChatEvent } from '@/lib/chat/event-dispatch';
import { ChatStream } from '@/lib/chat/stream';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { createChatStore, type ChatStore } from '@/store/chat-store';
import type { ChatErrorCode } from '@/types/errors';
import type { ChatWsTokenResponse, UnreadSummaryResponse } from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

type FetchChatWsToken = () => Promise<
	ServiceResponse<ChatWsTokenResponse, ChatErrorCode>
>;
type FetchUnreadSummary = () => Promise<
	ServiceResponse<UnreadSummaryResponse, ChatErrorCode>
>;

export type ChatStoreApi = ReturnType<typeof createChatStore>;

/**
 * Lightweight transport surface exposed alongside the store.
 *
 * Components use this to push outbound frames (message / typing / mark-read)
 * without ever holding a direct reference to the WebSocket — the provider
 * owns the stream's lifecycle and swaps it out on reconnect, so callers
 * always hit the current connection via closure over a ref.
 */
export interface ChatTransport {
	/**
	 * Sends a message over the WS stream.
	 * @returns `true` if the frame was dispatched (socket was OPEN),
	 *   `false` if callers must fall back to the REST action.
	 */
	sendMessage(conversationId: string, body: string, tempId: string): boolean;
	sendTyping(conversationId: string): void;
	sendMarkRead(conversationId: string, messageId: string): void;
}

/** Context for the chat store. Mounted under authenticated layouts only. */
export const ChatStoreContext = createContext<ChatStoreApi | undefined>(
	undefined,
);

/** Transport context — sibling of the store context. */
export const ChatTransportContext = createContext<ChatTransport | undefined>(
	undefined,
);

export interface ChatStoreProviderProps {
	readonly children: ReactNode;
	/**
	 * Server actions threaded down from the RSC parent. Passing them in
	 * keeps `@/services/*` out of this file's import graph so the WS-mount
	 * effect doesn't trip `local/no-useeffect-data-fetch` (data-fetching.md).
	 */
	readonly fetchChatWsToken: FetchChatWsToken;
	readonly fetchUnreadSummary: FetchUnreadSummary;
}

/**
 * Owns the chat store + the ChatStream lifecycle. Translates WS events
 * into store mutations and React Query invalidations.
 *
 * Scope: mounted under authenticated layouts. Unauthenticated tabs never
 * instantiate the WebSocket, honouring the same boundary as
 * `NotificationStoreProvider`.
 *
 * @param children - Child components consuming `useChatStore`.
 * @returns Provider tree exposing the store and transport via context.
 */
export function ChatStoreProvider({
	children,
	fetchChatWsToken,
	fetchUnreadSummary,
}: ChatStoreProviderProps) {
	// useState initializer — the store is created once per provider mount;
	// subsequent renders reuse the same instance to avoid invalidating
	// every downstream selector on each parent rerender.
	const [store] = useState(() => createChatStore());
	const queryClient = useQueryClient();

	// Ref over the active stream so the transport closure below always
	// hits the current connection — on reconnect we swap the instance but
	// keep the same `transport` identity, so components never re-render
	// purely because the socket flapped.
	const streamRef = useRef<ChatStream | null>(null);

	// Timers that expire a stale typing indicator after TYPING_TTL_MS.
	// Kept in a ref so we can clear them on unmount without re-running the
	// effect below and tearing down the WebSocket.
	const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);

	// Transport object — stable across renders. Each method dereferences
	// streamRef on call so a reconnect doesn't require re-rendering consumers.
	const [transport] = useState<ChatTransport>(() => ({
		sendMessage(conversationId, body, tempId) {
			const stream = streamRef.current;
			if (!stream) return false;
			// Propagate `send()` return — the underlying socket can drop the
			// frame (CLOSING / CLOSED) even when the store's `connected` flag
			// still reads true, because the close event and the React render
			// aren't synchronous. Surfacing the real outcome lets the
			// conversation view engage the REST fallback deterministically.
			return stream.send({ type: 'message', conversationId, body, tempId });
		},
		sendTyping(conversationId) {
			streamRef.current?.send({ type: 'typing', conversationId });
		},
		sendMarkRead(conversationId, messageId) {
			streamRef.current?.send({
				type: 'mark_read',
				conversationId,
				messageId,
			});
		},
	}));

	// Mount: open the WS stream, hydrate initial unread count, tear down on unmount.
	// Guarded by FEATURE_FLAGS.CHAT_ENABLED so turning off the flag stops
	// the WebSocket entirely — no wasted tokens or requests during the
	// rollout window.
	useEffect(() => {
		if (!FEATURE_FLAGS.CHAT_ENABLED) return;

		let disposed = false;
		const typingTimers = typingTimersRef.current;

		// Hydrate sequence number — protects against an in-flight summary
		// resolving AFTER a WS `message` event has already incremented the
		// store. Without it, the late hydrate would clobber the bumped count
		// with stale data and the badge would silently undercount until the
		// next reconnect/hydrate cycle. Each hydrate snapshots the current
		// sequence at issue time and discards itself if a newer hydrate (or
		// the cleanup that disposes the provider) was issued in the meantime.
		let hydrateSequence = 0;

		// Step 1: Hydrate the navbar badge + the per-conversation unread dots
		// before the WS connects, so the UI renders with correct data even
		// on the first render after login.
		async function hydrateUnread() {
			const issuedAt = ++hydrateSequence;
			const result = await fetchUnreadSummary();
			// Guard: a newer hydrate has been issued (e.g. WS reconnected and
			// re-fired this) or the provider is unmounting — drop this stale
			// response so we don't overwrite a fresher snapshot.
			if (!result.success || disposed || issuedAt !== hydrateSequence) return;
			const byConvo: Record<string, number> = {};
			for (const item of result.data.conversations) {
				byConvo[item.conversationId] = item.unreadCount;
			}
			store.getState().setUnreadSummary(result.data.totalUnread, byConvo);
		}

		// Step 2: Provide the chat stream with a fresh token per connect.
		// Returns null on failure so the stream backs off instead of crashing.
		async function requestToken() {
			const result = await fetchChatWsToken();
			if (!result.success) {
				if (clientEnv.NODE_ENV === 'development') {
					console.error('[ChatStream] token request failed:', result.error);
				}
				return null;
			}
			return result.data;
		}

		// Step 3: Instantiate the stream with lifecycle callbacks wired to
		// the store and the query client.
		const stream = new ChatStream({
			getToken: requestToken,
			onConnected() {
				store.getState().setConnected(true);
				// Re-hydrate unread on reconnect — we may have missed events
				// while the socket was down.
				void hydrateUnread();
				void queryClient.invalidateQueries({ queryKey: ['chat'] });
			},
			onDisconnected() {
				store.getState().setConnected(false);
			},
			onEvent(event) {
				dispatchChatEvent(event, { store, queryClient, typingTimers });
			},
		});
		streamRef.current = stream;

		void hydrateUnread();
		void stream.connect();

		return () => {
			disposed = true;
			streamRef.current = null;
			stream.disconnect();
			for (const timer of typingTimers.values()) {
				clearTimeout(timer);
			}
			typingTimers.clear();
			store.getState().reset();
		};
	}, [store, queryClient, fetchChatWsToken, fetchUnreadSummary]);

	return (
		<ChatStoreContext.Provider value={store}>
			<ChatTransportContext.Provider value={transport}>
				{children}
			</ChatTransportContext.Provider>
		</ChatStoreContext.Provider>
	);
}

/**
 * Typed selector hook for the chat store.
 *
 * @param selector - Extracts the slice of state the caller needs.
 * @returns The selected slice.
 * @throws Error if used outside a `ChatStoreProvider`.
 */
export function useChatStore<T>(selector: (store: ChatStore) => T): T {
	const ctx = use(ChatStoreContext);
	if (!ctx) {
		throw new Error(`useChatStore must be used within ChatStoreProvider`);
	}
	return useStore(ctx, selector);
}

/**
 * Accessor for outbound-frame helpers — keeps components decoupled from
 * the underlying WebSocket instance and safe to re-render without
 * retriggering reconnects.
 *
 * @returns Transport with typed `sendMessage` / `sendTyping` / `sendMarkRead`.
 * @throws Error if used outside a `ChatStoreProvider`.
 */
export function useChatTransport(): ChatTransport {
	const ctx = use(ChatTransportContext);
	if (!ctx) {
		throw new Error(`useChatTransport must be used within ChatStoreProvider`);
	}
	return ctx;
}
