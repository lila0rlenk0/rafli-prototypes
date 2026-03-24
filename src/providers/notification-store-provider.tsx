'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { useStore } from 'zustand';

import { clientEnv } from '@/env/client';
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
 * Callbacks are stored in refs to keep the useEffect dependency array empty,
 * preventing disconnect/reconnect cycles when React re-renders. Without this,
 * useCallback identities shift on re-render → useEffect re-runs → new stream
 * created → getWsToken called again → infinite POST loop.
 *
 * @param children - Child components
 */
export function NotificationStoreProvider({
	children,
}: NotificationStoreProviderProps) {
	const [store] = useState(() => createNotificationStore());
	const queryClient = useQueryClient();
	const streamRef = useRef<NotificationStream | null>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;

		/**
		 * Fetches unread count and updates store.
		 * store/queryClient are stable references (useState initializer + QueryClientProvider)
		 * so capturing them in the closure is safe without refs.
		 */
		async function fetchUnreadCount() {
			const result = await getUnreadCount();
			if (result.success && isMountedRef.current) {
				store.getState().setUnreadCount(result.data.count);
			}
		}

		/**
		 * Handles WebSocket new notification event —
		 * refreshes unread badge and invalidates notification query cache
		 */
		function handleNewNotification() {
			fetchUnreadCount();
			queryClient.invalidateQueries({
				queryKey: ['notification'],
			});
		}

		/**
		 * Fetches fresh WS token for stream connection
		 */
		async function getToken() {
			const result = await getWsToken();

			if (!result.success) {
				if (clientEnv.NODE_ENV === 'development') {
					console.error(
						'[NotificationStream] Failed to get token:',
						result.error,
					);
				}
				return null;
			}

			return result.data;
		}

		// Initial unread count fetch
		fetchUnreadCount();

		// Create stream with stable callbacks — only one stream per mount
		streamRef.current = new NotificationStream({
			onNewNotification: handleNewNotification,
			getToken,
		});

		streamRef.current.connect();

		return () => {
			isMountedRef.current = false;
			streamRef.current?.disconnect();
			streamRef.current = null;
		};
		// store and queryClient are stable (useState initializer + QueryClientProvider),
		// so including them satisfies exhaustive-deps without causing re-runs.
	}, [store, queryClient]);

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
