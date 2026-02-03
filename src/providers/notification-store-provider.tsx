'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { useStore } from 'zustand';

import { NotificationStream } from '@/lib/notification-stream';
import { getUnreadCount } from '@/services/notification/get-unread-count';
import { getWsToken } from '@/services/notification/get-ws-token';
import {
	createNotificationStore,
	type NotificationStore,
} from '@/store/notification-store';

export type NotificationStoreApi = ReturnType<typeof createNotificationStore>;

export const NotificationStoreContext = createContext<
	NotificationStoreApi | undefined
>(undefined);

export interface NotificationStoreProviderProps {
	children: ReactNode;
}

/**
 * NotificationStoreProvider Component
 *
 * Provides the Zustand notification store to all child components via Context.
 * Uses WebSocket for real-time updates.
 *
 * @param children - Child components
 */
export function NotificationStoreProvider({
	children,
}: NotificationStoreProviderProps) {
	const [store] = useState(() => createNotificationStore());
	const streamRef = useRef<NotificationStream | null>(null);
	const isMountedRef = useRef(true);

	/**
	 * Fetches unread count and updates store
	 */
	const fetchUnreadCount = useCallback(async () => {
		const result = await getUnreadCount();
		if (result.success && isMountedRef.current) {
			store.getState().setUnreadCount(result.data.count);
		}
	}, [store]);

	/**
	 * Handles WebSocket new notification event
	 */
	const handleNewNotification = useCallback(() => {
		fetchUnreadCount();
	}, [fetchUnreadCount]);

	useEffect(() => {
		isMountedRef.current = true;

		/**
		 * Initializes notification stream
		 */
		async function initialize() {
			// Initial fetch
			await fetchUnreadCount();

			// Get WS token and connect
			const tokenResult = await getWsToken();

			if (!isMountedRef.current) return;

			if (tokenResult.success) {
				streamRef.current = new NotificationStream({
					onNewNotification: handleNewNotification,
				});
				streamRef.current.connect(tokenResult.data.token);
			}
		}

		initialize();

		return () => {
			isMountedRef.current = false;
			streamRef.current?.disconnect();
			streamRef.current = null;
		};
	}, [fetchUnreadCount, handleNewNotification]);

	return (
		<NotificationStoreContext.Provider value={store}>
			{children}
		</NotificationStoreContext.Provider>
	);
}

/**
 * Hook to access the notification store
 *
 * @param selector - Selector function to extract data from store
 * @returns Selected data from store
 * @throws Error if used outside NotificationStoreProvider
 */
export function useNotificationStore<T>(
	selector: (store: NotificationStore) => T,
): T {
	const notificationStoreContext = useContext(NotificationStoreContext);

	if (!notificationStoreContext) {
		throw new Error(
			`useNotificationStore must be used within NotificationStoreProvider`,
		);
	}

	return useStore(notificationStoreContext, selector);
}
