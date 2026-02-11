'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { NotificationErrorCode } from '@/types/errors';
import type { MarkReadResponse } from '@/types/notification';

import { markAllNotificationsRead } from './mark-all-notifications-read';

/**
 * Mutation hook for marking all notifications as read
 * Invalidates all notification queries on success
 * @returns React Query mutation result
 */
export function useMarkAllNotificationsRead() {
	const queryClient = useQueryClient();

	return useMutation<MarkReadResponse, ServiceError<NotificationErrorCode>>({
		mutationFn: async function markAllRead() {
			const result = await markAllNotificationsRead();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess() {
			queryClient.invalidateQueries({ queryKey: ['notification'] });
		},
	});
}
