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

	/**
	 * Fetches fresh WS token for stream connection
	 */
	const getToken = useCallback(async () => {
		const result = await getWsToken();

		if (!result.success) {
			if (process.env.NODE_ENV === 'development') {
				console.error('[NotificationStream] Failed to get token:', result.error);
			}
			return null;
		}

		return result.data;
	}, []);

	useEffect(() => {
		isMountedRef.current = true;

		/**
		 * Initializes notification stream
		 */
		async function initialize() {
			// Initial fetch
			await fetchUnreadCount();

			// Create stream with token callback
			streamRef.current = new NotificationStream({
				onNewNotification: handleNewNotification,
				getToken,
			});

			// Connect (will fetch token internally)
			streamRef.current.connect();
		}

		initialize();

		return () => {
			isMountedRef.current = false;
			streamRef.current?.disconnect();
			streamRef.current = null;
		};
	}, [fetchUnreadCount, handleNewNotification, getToken]);

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
