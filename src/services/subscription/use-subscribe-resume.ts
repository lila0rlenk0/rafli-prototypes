'use client';

import { useMutation } from '@tanstack/react-query';

import { subscribeToPlan } from '@/services/subscription/subscribe-to-plan';
import type {
	CreateSubscriptionResponse,
	SubscribeToPlanPayload,
} from '@/types/subscription';
import type { SubscriptionErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * React Query mutation that triggers `subscribeToPlan` from the post-login
 * resume effect. Wrapping the action in a hook keeps the effect body free
 * of `@/services/*` imports — `local/no-useeffect-data-fetch`
 * (data-fetching.md) bans direct service calls inside `useEffect`.
 *
 * @returns React Query mutation handle
 */
export function useSubscribeResume() {
	return useMutation<
		ServiceResponse<CreateSubscriptionResponse, SubscriptionErrorCode>,
		Error,
		SubscribeToPlanPayload
	>({
		mutationFn: payload => subscribeToPlan(payload),
	});
}
