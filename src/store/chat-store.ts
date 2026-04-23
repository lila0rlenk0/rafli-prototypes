import { createStore } from 'zustand/vanilla';

import { createConnectionSlice } from './chat/slices/connection-slice';
import { createMessagesSlice } from './chat/slices/messages-slice';
import { createPendingSlice } from './chat/slices/pending-slice';
import { createPresenceSlice } from './chat/slices/presence-slice';
import { createTypingSlice } from './chat/slices/typing-slice';
import { createUnreadSlice } from './chat/slices/unread-slice';
import {
	defaultInitState,
	type ChatStore,
	type ChatStoreState,
} from './chat/slices/types';

export { defaultInitState };
export type {
	ChatStore,
	ChatStoreState,
	ChatStoreActions,
	PendingSend,
} from './chat/slices/types';

/**
 * Vanilla store factory — composes six independent slice factories. Each
 * slice owns a well-defined concern (messages, pending sends, typing,
 * presence, unread counts, connection lifecycle) so selector subscriptions
 * and future contributions stay scoped.
 *
 * The provider owns the single instance and exposes it through context —
 * same pattern as `createNotificationStore` / `createUserStore`.
 *
 * @param initState - Initial state override (tests only).
 * @returns Zustand vanilla store instance.
 */
export function createChatStore(initState: ChatStoreState = defaultInitState) {
	return createStore<ChatStore>()((set, get) => ({
		...initState,
		...createConnectionSlice(set),
		...createMessagesSlice(set, get),
		...createPendingSlice(set, get),
		...createTypingSlice(set, get),
		...createPresenceSlice(set),
		...createUnreadSlice(set, get),
	}));
}
