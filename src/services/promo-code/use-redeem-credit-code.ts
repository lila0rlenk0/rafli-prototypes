'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { PromoCodeErrorCode } from '@/types/errors';

import {
	redeemCreditCode,
	type RedeemCreditCodePayload,
	type RedeemCreditCodeResponse,
} from './redeem-credit-code';

/**
 * Mutation hook for redeeming a credit-grant promo code.
 *
 * Why a mutation hook (not `useTransition`):
 * - Components need cached `isPending` / `error` to drive the inline error +
 *   loader on the redeem field without piping a bag of state through props.
 * - Success requires an immediate re-fetch of the credit balance — wrapping
 *   `redeemCreditCode` in `useMutation` lets us invalidate the `['credits']`
 *   query key and have the navbar `SubscriptionPill` + the profile credits
 *   card both refresh from a single onSuccess hook. The server action also
 *   `revalidatePath('/profile', …)` so a hard nav back to the page paints the
 *   new balance even before the React Query cache rehydrates.
 *
 * The mutation throws `serviceError(code)` on failure so the bridge in
 * `@/lib/query/errors` carries the typed `PromoCodeErrorCode` into the
 * component's error branch — the UI maps that to a user-facing message.
 *
 * @returns React Query mutation result.
 */
export function useRedeemCreditCode() {
	const queryClient = useQueryClient();

	return useMutation<
		RedeemCreditCodeResponse,
		ServiceError<PromoCodeErrorCode>,
		RedeemCreditCodePayload
	>({
		mutationFn: async function redeem(payload) {
			const result = await redeemCreditCode(payload);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess() {
			// Invalidate the whole `['credits']` family — both balance
			// (`['credits', 'balance']`) and any future credit history queries
			// share the prefix and need to refetch after a grant.
			queryClient.invalidateQueries({ queryKey: ['credits'] });
		},
	});
}
