'use client';

import { useMutation } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { SubscriptionErrorCode } from '@/types/errors';
import type {
	CancelSubscriptionPayload,
	CancelSubscriptionResponse,
} from '@/types/subscription';

import { cancelSubscription } from './cancel-subscription';
import { useInvalidateMySubscription } from './use-my-subscription';

/**
 * Mutation hook wrapping the cancel-subscription server action.
 *
 * On success: client-side React Query invalidation runs alongside the
 * server-side `revalidateMySubscription()` already fired inside the action.
 * Two layers needed because consumers split — RSC reads (`/pricing` page,
 * profile credits section) need `revalidatePath`, while live client
 * subscribers (`useMySubscription` in the navbar tier badge) need the
 * React Query invalidation to refetch on next read.
 *
 * Errors flow back as `ServiceError<SubscriptionErrorCode>` via the
 * `serviceError` bridge so `.error?.code` narrows for the dialog's toast
 * lookup. Mutations are never retried per `data-fetching.md`.
 *
 * @returns React Query mutation result for the cancel flow.
 */
export function useCancelSubscription() {
	const invalidateMySubscription = useInvalidateMySubscription();
	return useMutation<
		CancelSubscriptionResponse,
		ServiceError<SubscriptionErrorCode>,
		CancelSubscriptionPayload
	>({
		mutationFn: async function executeCancel(payload) {
			const result = await cancelSubscription(payload);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess: function invalidateAfterCancel() {
			void invalidateMySubscription();
		},
	});
}
