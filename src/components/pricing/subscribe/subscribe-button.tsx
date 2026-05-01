'use client';

// Client boundary: handles click, tracks loading state via useTransition,
// and triggers a full-page redirect to Stripe Checkout. None of this is
// expressible in a pure Server Component.

import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { getSubscribeErrorMessage } from '@/components/pricing/subscribe/error-messages';
import { Button } from '@/components/ui/button';
import { subscribeToPlan } from '@/services/subscription/subscribe-to-plan';

interface SubscribeButtonProps {
	/** Plan to subscribe to. Validated server-side too — this is best-effort. */
	planId: string;
	/** Button label — "Get Starter", "Get Pro", etc. */
	label: string;
	/** Whether the current viewer has an active session. Gates the action. */
	isAuthenticated: boolean;
	/** Controls the dark vs. light card variant styling. */
	variant?: 'primary' | 'secondary';
}

/**
 * Per-plan "Get <plan>" CTA. Triggers the subscription server action, then
 * redirects the browser to the Stripe-hosted checkout URL the backend returns.
 *
 * Unauthenticated click routes to /sign-in with a `returnTo` pointing back to
 * /pricing, so the user lands on this page already signed in and can retry
 * the click without re-navigating.
 *
 * Error surface: every mapped code is shown via `sonner` toast. Server-side
 * analytics already captured the failure with plan_id + error_code before the
 * response returned — we deliberately don't double-track on the client.
 *
 * @returns Pending-aware Stripe-checkout CTA with sign-in deflection.
 */
export function SubscribeButton({
	planId,
	label,
	isAuthenticated,
	variant = 'primary',
}: SubscribeButtonProps) {
	// `useTransition` gives us a pending flag without blocking navigation, and
	// it composes cleanly with the action's async nature. No useEffect needed.
	const [isPending, startTransition] = useTransition();

	function handleClick() {
		if (!isAuthenticated) {
			// Preserve the plan the user clicked — plain `returnTo=/pricing`
			// loses intent and forces them to re-pick after sign-in. Encoding
			// `plan=<id>` lets the pricing page auto-resume the Stripe handoff
			// on return (handled by the page-level resume effect).
			const returnTo = `/pricing?plan=${encodeURIComponent(planId)}`;
			// Full-page navigation on purpose — sign-in lives under a different
			// layout (`(auth)` group) so `router.push` would still trigger a
			// segment-level reload. Using `assign` keeps behavior predictable.
			window.location.assign(
				`/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
			);
			return;
		}

		startTransition(async () => {
			const result = await subscribeToPlan({ planId });

			if (!result.success) {
				toast.error(getSubscribeErrorMessage(result.error));
				return;
			}

			// Success: redirect to Stripe. `assign` over `replace` so the user
			// can still hit "back" to return to /pricing if they abandon checkout.
			window.location.assign(result.data.checkoutUrl);
		});
	}

	// Both variants render as `size="lg"` (shadcn's 10px height default) but
	// we override to `h-12` so the CTA feels tappable on touch devices (44px+
	// target) and matches the visual weight of the countdown CTA. Letting the
	// shadcn `Button` own the base classes preserves focus-visible ring,
	// disabled opacity, and active-press feedback that the previous hand-rolled
	// className set was silently dropping.
	//
	// Variant mapping:
	// - `primary` → shadcn `default` — filled black button used on the featured
	//   plan to pull the eye toward the highlighted CTA
	// - `secondary` → shadcn `outline` — black border + transparent fill that
	//   reads as a quiet "also available" option on the non-featured plan
	return (
		<Button
			type="button"
			size="lg"
			variant={variant === 'primary' ? 'default' : 'outline'}
			onClick={handleClick}
			disabled={isPending}
			className="h-12 w-full font-semibold"
			aria-busy={isPending}
		>
			{isPending ? (
				<>
					<Loader2 className="animate-spin" aria-hidden />
					<span>Starting checkout…</span>
				</>
			) : (
				label
			)}
		</Button>
	);
}
