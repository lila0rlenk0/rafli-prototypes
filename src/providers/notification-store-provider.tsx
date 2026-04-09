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

/**
 * Broad query key prefix — invalidates all notification queries (list, count, etc.)
 * Matches the first segment of keys produced by `notificationsKey()` in use-notifications.
 */
const NOTIFICATION_QUERY_PREFIX = 'notification' as const;

export type NotificationStoreApi = ReturnType<typeof createNotificationStore>;

// Context lives at the authenticated layout level — only mounted when the
// user is signed in, so unauthenticated pages never pay for the WebSocket.
export const NotificationStoreContext = createContext<
	NotificationStoreApi | undefined
>(undefined);

export interface NotificationStoreProviderProps {
	readonly children: ReactNode;
}

/**
 * Provides notification store and owns the WebSocket stream lifecycle.
 * Scope: wraps the authenticated layout — children include the header
 * badge and notification drawer, both of which consume the store.
 *
 * @param children - Child components
 * @returns Provider wrapping children with notification store context
 */
export function NotificationStoreProvider({
	children,
}: NotificationStoreProviderProps) {
	// useState initializer — store is created once per provider mount
	const [store] = useState(() => createNotificationStore());
	const queryClient = useQueryClient();

	// mount: fetch initial unread count + establish WebSocket stream.
	// Deps are stable references (store instance and queryClient singleton)
	// so this only runs on mount/unmount.
	useEffect(() => {
		let isMounted = true;

		// Step 1: Fetch initial unread count from the server
		async function fetchUnreadCount() {
			const result = await getUnreadCount();
			if (result.success && isMounted) {
				store.getState().setUnreadCount(result.data.count);
			}
		}

		// Step 2: Shared handler for WebSocket events — both new-notification
		// and reconnect need a fresh count + React Query cache bust so the
		// notification list re-fetches.
		function handleNotificationEvent() {
			void fetchUnreadCount();
			void queryClient.invalidateQueries({
				queryKey: [NOTIFICATION_QUERY_PREFIX],
			});
		}

		// Step 3: Acquire a short-lived WS token via server action
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

		// Step 4: Kick off initial fetch and open the stream
		void fetchUnreadCount();

		const stream = new NotificationStream({
			onNewNotification: handleNotificationEvent,
			onReconnected: handleNotificationEvent,
			getToken,
		});

		void stream.connect();

		// Cleanup: disconnect WebSocket on unmount (sign-out / layout change)
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
 * Typed selector hook for the notification store.
 *
 * @param selector - Selector function to extract data from store
 * @returns Selected data from store
 * @throws Error if used outside NotificationStoreProvider
 */
export function useNotificationStore<T>(
	selector: (store: NotificationStore) => T,
): T {
	const ctx = use(NotificationStoreContext);

	if (!ctx) {
		throw new Error(
			`useNotificationStore must be used within NotificationStoreProvider`,
		);
	}

	return useStore(ctx, selector);
}
