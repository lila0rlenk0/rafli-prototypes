import { createStore } from 'zustand/vanilla';

export interface NotificationStoreState {
	unreadCount: number;
}

export interface NotificationStoreActions {
	setUnreadCount: (count: number) => void;
	decrementUnreadCount: () => void;
	clearUnreadCount: () => void;
}

export type NotificationStore = NotificationStoreState &
	NotificationStoreActions;

export const defaultInitState: NotificationStoreState = {
	unreadCount: 0,
};

/**
 * Creates a new notification store instance
 *
 * @param initState - Initial state for the store
 * @returns Zustand store instance
 */
export function createNotificationStore(
	initState: NotificationStoreState = defaultInitState,
) {
	return createStore<NotificationStore>()(set => ({
		...initState,

		/**
		 * Set the unread count from server
		 *
		 * @param count - New unread count
		 */
		setUnreadCount: (count: number) => {
			set({ unreadCount: count });
		},

		/**
		 * Decrement unread count by 1 (optimistic update on mark-read)
		 */
		decrementUnreadCount: () => {
			set(state => ({
				unreadCount: Math.max(0, state.unreadCount - 1),
			}));
		},

		/**
		 * Clear unread count to 0 (after mark-all-read)
		 */
		clearUnreadCount: () => {
			set({ unreadCount: 0 });
		},
	}));
}
