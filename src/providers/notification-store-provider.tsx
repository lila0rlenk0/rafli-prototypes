'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

import { clientEnv } from '@/env/client';
import { NotificationStream } from '@/lib/notifications/stream';
import { NOTIFICATION_QUERY_PREFIX } from '@/services/notification/use-notifications';
import {
	createNotificationStore,
	type NotificationStore,
} from '@/store/notification-store';
import type { NotificationErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

export type NotificationStoreApi = ReturnType<typeof createNotificationStore>;

type FetchWsTokenResult = ServiceResponse<
	{ token: string; expiresIn: number },
	NotificationErrorCode
>;

type FetchWsToken = () => Promise<FetchWsTokenResult>;

type FetchUnreadCountResult = ServiceResponse<
	{ count: number },
	NotificationErrorCode
>;

type FetchUnreadCount = () => Promise<FetchUnreadCountResult>;

// Context lives at the authenticated layout level — only mounted when the
// user is signed in, so unauthenticated pages never pay for the WebSocket.
export const NotificationStoreContext = createContext<
	NotificationStoreApi | undefined
>(undefined);

export interface NotificationStoreProviderProps {
	readonly children: ReactNode;
	/**
	 * Server actions threaded down from the RSC parent. Passing them in
	 * keeps `@/services/*` out of this file's import graph so the WS-mount
	 * effect doesn't trip `local/no-useeffect-data-fetch`
	 * (data-fetching.md).
	 */
	readonly fetchNotificationWsToken: FetchWsToken;
	readonly fetchUnreadCount: FetchUnreadCount;
}

/**
 * Provides notification store and owns the WebSocket stream lifecycle.
 * Scope: wraps the authenticated layout — children include the header
 * badge and notification drawer, both of which consume the store.
 *
 * @param children - Child components
 * @param fetchNotificationWsToken - Server action that mints a short-lived
 *   WS token; threaded through props so the mount effect never imports
 *   `@/services/*` directly.
 * @returns Provider wrapping children with notification store context
 */
export function NotificationStoreProvider({
	children,
	fetchNotificationWsToken,
	fetchUnreadCount,
}: NotificationStoreProviderProps) {
	// useState initializer — store is created once per provider mount
	const [store] = useState(() => createNotificationStore());
	const queryClient = useQueryClient();

	// mount: fetch initial unread count + establish WebSocket stream.
	// Deps are stable references (store instance, queryClient singleton,
	// server actions threaded as props) so this only runs on mount.
	useEffect(() => {
		let isMounted = true;

		// Step 1: Fetch initial unread count from the server.
		async function loadInitialUnreadCount() {
			const result = await fetchUnreadCount();
			if (result.success && isMounted) {
				store.getState().setUnreadCount(result.data.count);
			}
		}

		// Step 2: Shared handler — both new-notification and reconnect need
		// a fresh count + React Query cache bust so the notification list
		// re-fetches.
		function handleNotificationEvent() {
			void loadInitialUnreadCount();
			void queryClient.invalidateQueries({
				queryKey: [NOTIFICATION_QUERY_PREFIX],
			});
		}

		// Step 3: Acquire a short-lived WS token via server action.
		async function getToken() {
			const result = await fetchNotificationWsToken();

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

		// Step 4: Kick off initial fetch and open the stream.
		void loadInitialUnreadCount();

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
	}, [store, queryClient, fetchNotificationWsToken, fetchUnreadCount]);

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
