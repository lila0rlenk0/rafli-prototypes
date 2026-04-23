import type { Message } from '@/types/chat';

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
	readonly upsertMessage: (message: Message, tempId?: string) => void;
	readonly replaceMessage: (updated: Message) => void;
	readonly softDeleteMessage: (
		conversationId: string,
		messageId: string,
	) => void;
	readonly addPending: (
		tempId: string,
		conversationId: string,
		body: string,
	) => void;
	readonly failPending: (tempId: string, errorCode: string) => void;
	readonly clearPending: (tempId: string) => void;
	readonly setTyping: (conversationId: string, userId: string) => void;
	readonly clearTyping: (conversationId: string, userId: string) => void;
	readonly setPresence: (userId: string, online: boolean) => void;
	readonly setUnreadSummary: (
		total: number,
		byConvo: Record<string, number>,
	) => void;
	readonly incrementUnread: (conversationId: string) => void;
	readonly markConversationRead: (conversationId: string) => void;
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
 * Zustand vanilla store `set` — narrowed to `ChatStore` so slice factories
 * accept the same signature the store exposes. Using the concrete vanilla
 * store generic signature keeps TS happy without pulling the full zustand
 * types into every slice file.
 */
export type ChatStoreSet = {
	(
		partial:
			| ChatStore
			| Partial<ChatStore>
			| ((state: ChatStore) => ChatStore | Partial<ChatStore>),
		replace?: false,
	): void;
	(state: ChatStore | ((state: ChatStore) => ChatStore), replace: true): void;
};
export type ChatStoreGet = () => ChatStore;
