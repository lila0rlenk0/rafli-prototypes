import type { ReactNode } from 'react';

import { ChatStoreProvider } from '@/providers/chat-store-provider';
import { NotificationStoreProvider } from '@/providers/notification-store-provider';
import { getChatWsToken } from '@/services/chat/get-chat-ws-token';
import { getUnreadSummary } from '@/services/chat/get-unread-summary';
import { getUnreadCount } from '@/services/notification/get-unread-count';
import { getWsToken as getNotificationWsToken } from '@/services/notification/get-ws-token';

interface RealtimeProvidersProps {
	children: ReactNode;
}

/**
 * Server component that wires the notification + chat WebSocket providers
 * with the server actions they need. Imports `@/services/*` here so the
 * client providers stay free of those imports — the WS-mount effects then
 * pass `local/no-useeffect-data-fetch` (data-fetching.md).
 *
 * @returns The composed `NotificationStoreProvider` + `ChatStoreProvider`
 *   wrapping `children`
 */
export function RealtimeProviders({ children }: RealtimeProvidersProps) {
	return (
		<NotificationStoreProvider
			fetchNotificationWsToken={getNotificationWsToken}
			fetchUnreadCount={getUnreadCount}
		>
			<ChatStoreProvider
				fetchChatWsToken={getChatWsToken}
				fetchUnreadSummary={getUnreadSummary}
			>
				{children}
			</ChatStoreProvider>
		</NotificationStoreProvider>
	);
}
