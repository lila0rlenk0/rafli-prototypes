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

/** Polling interval when WebSocket unavailable */
const FALLBACK_POLLING_INTERVAL_MS = 30_000;

export interface NotificationStoreProviderProps {
	children: ReactNode;
}

/**
 * NotificationStoreProvider Component
 *
 * Provides the Zustand notification store to all child components via Context.
 * Uses WebSocket for real-time updates, falls back to polling on failure.
 *
 * @param children - Child components
 */
export function NotificationStoreProvider({
	children,
}: NotificationStoreProviderProps) {
	const [store] = useState(() => createNotificationStore());
	const streamRef = useRef<NotificationStream | null>(null);
	const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);
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
	 * Starts polling fallback
	 */
	const startPolling = useCallback(() => {
		if (pollingIntervalRef.current) return;

		pollingIntervalRef.current = setInterval(
			fetchUnreadCount,
			FALLBACK_POLLING_INTERVAL_MS,
		);
	}, [fetchUnreadCount]);

	/**
	 * Stops polling
	 */
	const stopPolling = useCallback(() => {
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}
	}, []);

	/**
	 * Handles WebSocket new notification event
	 */
	const handleNewNotification = useCallback(() => {
		fetchUnreadCount();
	}, [fetchUnreadCount]);

	/**
	 * Handles WebSocket max reconnect failure
	 */
	const handleMaxReconnectFailed = useCallback(() => {
		startPolling();
	}, [startPolling]);

	useEffect(() => {
		isMountedRef.current = true;

		/**
		 * Initializes notification stream or falls back to polling
		 */
		async function initialize() {
			// Initial fetch regardless of connection method
			await fetchUnreadCount();

			// Try to get WS token and connect
			const tokenResult = await getWsToken();

			if (!isMountedRef.current) return;

			if (tokenResult.success) {
				streamRef.current = new NotificationStream({
					onNewNotification: handleNewNotification,
					onMaxReconnectFailed: handleMaxReconnectFailed,
				});
				streamRef.current.connect(tokenResult.data.token);
			} else {
				// WS token fetch failed, fall back to polling
				startPolling();
			}
		}

		initialize();

		return () => {
			isMountedRef.current = false;
			streamRef.current?.disconnect();
			streamRef.current = null;
			stopPolling();
		};
	}, [
		fetchUnreadCount,
		handleNewNotification,
		handleMaxReconnectFailed,
		startPolling,
		stopPolling,
	]);

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
