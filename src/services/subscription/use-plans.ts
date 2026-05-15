'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { SubscriptionErrorCode } from '@/types/errors';
import type { SubscriptionPlansResponse } from '@/types/subscription';

import { getPlans } from './get-plans';

/** Query key — invalidate with `['subscription', 'plans']` if Ops re-seeds. */
function plansKey() {
	return ['subscription', 'plans'] as const;
}

/**
 * Query hook for the public `GET /subscriptions/plans` catalogue.
 *
 * Used by the change-plan dialog on the profile page to render plan rows
 * without a useEffect+fetch pattern (forbidden by `.claude/rules/data-fetching.md`).
 * Reads through the project-wide `staleTime: Infinity` default — plans are
 * Ops-managed and change rarely; manual invalidation is fine.
 *
 * @param enabled - Gates the network hop so the dialog only fetches on open.
 * @returns React Query result with the validated plans envelope.
 */
export function usePlans(options: { enabled: boolean }) {
	return useQuery<
		SubscriptionPlansResponse,
		ServiceError<SubscriptionErrorCode>
	>({
		queryKey: plansKey(),
		queryFn: async function fetchPlans() {
			const result = await getPlans();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: options.enabled,
	});
}
