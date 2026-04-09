'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
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
 * The effect owns the stream for the mount lifecycle, so local callbacks are
 * enough and no extra refs are needed.
 *
 * @param children - Child components
 * @returns Provider wrapping children with notification store context
 */
export function NotificationStoreProvider({
	children,
}: NotificationStoreProviderProps) {
	const [store] = useState(() => createNotificationStore());
	const queryClient = useQueryClient();

	useEffect(() => {
		let isMounted = true;

		async function fetchUnreadCount() {
			const result = await getUnreadCount();
			if (result.success && isMounted) {
				store.getState().setUnreadCount(result.data.count);
			}
		}

		function handleNewNotification() {
			void fetchUnreadCount();
			void queryClient.invalidateQueries({
				queryKey: ['notification'],
			});
		}

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

		void fetchUnreadCount();

		function handleReconnected() {
			void fetchUnreadCount();
			void queryClient.invalidateQueries({
				queryKey: ['notification'],
			});
		}

		const stream = new NotificationStream({
			onNewNotification: handleNewNotification,
			onReconnected: handleReconnected,
			getToken,
		});

		void stream.connect();

		return () => {
			isMounted = false;
			stream.disconnect();
		};
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
	const notificationStoreContext = use(NotificationStoreContext);

	if (!notificationStoreContext) {
		throw new Error(
			`useNotificationStore must be used within NotificationStoreProvider`,
		);
	}

	return useStore(notificationStoreContext, selector);
}
