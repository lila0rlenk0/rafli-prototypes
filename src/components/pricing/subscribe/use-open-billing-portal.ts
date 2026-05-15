'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { getManagePortalErrorMessage } from '@/components/pricing/subscribe/error-messages';
import { createBillingPortal } from '@/services/subscription/create-billing-portal';
import { useInvalidateMySubscription } from '@/services/subscription/use-my-subscription';

interface OpenBillingPortalHandle {
	readonly open: () => void;
	readonly isPending: boolean;
}

/**
 * Mints a Stripe Customer Portal session and full-page-redirects to it.
 *
 * Shared between the pricing-page text-link `ManageSubscriptionButton` and
 * the profile-card pill `ManageSubscriptionPillButton` — the chrome differs
 * but the action plumbing (transition + cache invalidation + redirect +
 * error toast) is identical, so it lives here once.
 *
 * Why we invalidate the subscription cache *before* the redirect rather
 * than on return: the user is leaving for the portal where they may
 * cancel / change plan / update payment method. Marking the cache stale
 * up-front guarantees the next read in any tab refetches the post-portal
 * state instead of serving the pre-portal payload from React Query's
 * `staleTime: Infinity` policy. `void` because the redirect must not wait
 * on the invalidation resolving.
 *
 * `window.location.assign` over `router.push`: the portal lives on a
 * different origin and frame-busts under most Stripe configurations, so
 * a full-page nav is required. `assign` (not `replace`) keeps the back
 * button pointed at our app.
 *
 * @returns `{ open, isPending }` — `open` is the click handler;
 *   `isPending` flips while the action resolves and the redirect arms.
 */
export function useOpenBillingPortal(): OpenBillingPortalHandle {
	const [isPending, startTransition] = useTransition();
	const invalidateMySubscription = useInvalidateMySubscription();

	function open() {
		startTransition(async () => {
			const result = await createBillingPortal();
			if (!result.success) {
				toast.error(getManagePortalErrorMessage(result.error));
				return;
			}
			void invalidateMySubscription();
			window.location.assign(result.data.url);
		});
	}

	return { open, isPending };
}
