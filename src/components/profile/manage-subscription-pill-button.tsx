'use client';

import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { getManagePortalErrorMessage } from '@/components/pricing/subscribe/error-messages';
import { Button } from '@/components/ui/button';
import { createBillingPortal } from '@/services/subscription/create-billing-portal';
import { useInvalidateMySubscription } from '@/services/subscription/use-my-subscription';

/**
 * Outline pill button rendered in the credits-card header for entitled users.
 * Opens the Stripe Customer Portal where the user manages payment method,
 * changes plan, or cancels.
 *
 * Sibling to `pricing/subscribe/ManageSubscriptionButton` (text-link variant
 * sitting beneath the pricing-page plan pill). Same redirect plumbing, distinct
 * chrome — the pricing page wants a quiet underline, the credits card wants an
 * outlined pill button matching the Figma profile mock.
 *
 * @returns Outline pill button that opens the Stripe Customer Portal.
 */
export function ManageSubscriptionPillButton() {
	const [isPending, startTransition] = useTransition();
	const invalidateMySubscription = useInvalidateMySubscription();

	function handleClick() {
		startTransition(async () => {
			const result = await createBillingPortal();

			if (!result.success) {
				toast.error(getManagePortalErrorMessage(result.error));
				return;
			}

			// User leaves for the Stripe-hosted portal where they may cancel /
			// change plan. Mark the subscription cache stale before redirect so
			// the next read on return refetches the post-portal state instead of
			// serving the pre-portal payload. `void` because the invalidation is
			// fire-and-forget — the redirect must not wait on it.
			void invalidateMySubscription();

			// Full-page navigation on purpose — Stripe Portal lives on a
			// different origin and frame-busts under most configurations.
			// `assign` over `replace` keeps the back button pointed home.
			window.location.assign(result.data.url);
		});
	}

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={handleClick}
			disabled={isPending}
			aria-busy={isPending}
			className="border-brand-dark hover:bg-brand-dark px-6 font-semibold hover:text-white"
		>
			{isPending ? (
				<Loader2 className="size-4 animate-spin" aria-hidden />
			) : (
				'Manage My Subscription'
			)}
		</Button>
	);
}
