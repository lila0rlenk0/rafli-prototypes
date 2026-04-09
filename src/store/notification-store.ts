import { createStore } from 'zustand/vanilla';

// --- State & Action interfaces ---
// Separated so the provider can type the initial state without actions.

export interface NotificationStoreState {
	readonly unreadCount: number;
}

export interface NotificationStoreActions {
	readonly setUnreadCount: (count: number) => void;
	readonly decrementUnreadCount: () => void;
	readonly clearUnreadCount: () => void;
}

export type NotificationStore = NotificationStoreState &
	NotificationStoreActions;

/** Default state — zero unread until hydrated from the server */
export const defaultInitState: Readonly<NotificationStoreState> = {
	unreadCount: 0,
};

/**
 * Creates a vanilla Zustand store for notification badge state.
 * Vanilla (non-React) so the provider owns the single instance and
 * passes it via context — follows the createStore + provider pattern.
 *
 * @param initState - Initial state for the store
 * @returns Zustand vanilla store instance
 */
export function createNotificationStore(
	initState: NotificationStoreState = defaultInitState,
) {
	return createStore<NotificationStore>()(set => ({
		...initState,

		setUnreadCount: count => {
			set({ unreadCount: count });
		},

		// Math.max prevents going negative on out-of-order server/client events
		// (e.g. WebSocket "mark read" arrives before the SSE decrement)
		decrementUnreadCount: () => {
			set(state => ({
				unreadCount: Math.max(0, state.unreadCount - 1),
			}));
		},

		clearUnreadCount: () => {
			set({ unreadCount: 0 });
		},
	}));
}
