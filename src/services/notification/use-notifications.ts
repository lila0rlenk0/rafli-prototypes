'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { NotificationErrorCode } from '@/types/errors';
import type { ListNotificationsResponse } from '@/types/notification';

import { getNotifications } from './get-notifications';

/** Query key for notifications list */
export function notificationsKey(params?: { limit?: number }) {
	return ['notification', 'list', params] as const;
}

/**
 * Query hook for fetching notifications
 * @param options - Query options (limit, enabled)
 * @returns React Query result with notifications data
 */
export function useNotifications(options?: {
	limit?: number;
	enabled?: boolean;
}) {
	return useQuery<
		ListNotificationsResponse,
		ServiceError<NotificationErrorCode>
	>({
		queryKey: notificationsKey({ limit: options?.limit }),
		queryFn: async function fetchNotifications() {
			const result = await getNotifications({ limit: options?.limit });
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: options?.enabled ?? true,
	});
}
