'use client';

// Client boundary: handles click, tracks loading state via useTransition,
// and triggers a full-page redirect to the Stripe Customer Portal. The
// portal URL is short-lived and minted per-click, so the redirect can't be
// pre-rendered as a static `<Link>` like the unauth CTA path.

import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { getManagePortalErrorMessage } from '@/components/pricing/subscribe/error-messages';
import { createBillingPortal } from '@/services/subscription/create-billing-portal';
import { useInvalidateMySubscription } from '@/services/subscription/use-my-subscription';

/**
 * "Manage subscription" link rendered under the current-plan pill. Calls
 * the portal server action on click and full-page redirects to the
 * Stripe-hosted Customer Portal.
 *
 * Rendered as a raw `<button>` rather than the shadcn `<Button variant="link">`
 * primitive: the shadcn variant uses `text-primary` (cyan) with
 * `hover:underline`, but the pricing page's text-link convention is
 * `text-black` with persistent underline that toggles off on hover (see
 * `launch-countdown.tsx` and `pricing/page.tsx` for the same shape). No
 * shadcn variant matches that convention, and per `styling.md` we can't
 * override the primitive's color/typography via `className`. `useTransition`
 * gives us a pending flag without blocking React, and we swap to a spinner
 * inline so the click-to-redirect latency is communicated.
 *
 * @returns Underlined text-link button that opens the Stripe Customer Portal.
 */
export function ManageSubscriptionButton() {
	const [isPending, startTransition] = useTransition();
	const invalidateMySubscription = useInvalidateMySubscription();

	function handleClick() {
		startTransition(async () => {
			const result = await createBillingPortal();

			if (!result.success) {
				toast.error(getManagePortalErrorMessage(result.error));
				return;
			}

			// User is about to leave for the Stripe Customer Portal where they
			// may cancel / change plan. Mark the subscription cache stale before
			// redirect so when they navigate back to any in-app page that
			// consumes `useMySubscription`, the next read refetches fresh state
			// instead of showing the pre-portal payload. `void` because the
			// invalidation is fire-and-forget — the redirect must not wait on it.
			void invalidateMySubscription();

			// Full-page navigation on purpose — Stripe Portal lives on a
			// different origin and many configurations frame-bust. `assign`
			// over `replace` so the back button returns the user here.
			window.location.assign(result.data.url);
		});
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={isPending}
			aria-busy={isPending}
			// `outline-none` always — `focus-visible:outline-none` alone
			// only fires on keyboard focus, so a mouse click leaves the
			// browser default outline painted around the link. The cyan
			// ring still appears on keyboard focus via `focus-visible:ring-3`.
			// `disabled:pointer-events-none disabled:opacity-50` mirrors the
			// shadcn `<Button>` primitive's disabled treatment.
			className="text-foreground focus-visible:ring-ring/50 mx-auto inline-flex items-center gap-2 rounded-sm text-sm font-medium underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50"
		>
			{isPending ? (
				<>
					<Loader2 className="size-4 animate-spin" aria-hidden />
					<span>Opening portal…</span>
				</>
			) : (
				'Manage subscription'
			)}
		</button>
	);
}
