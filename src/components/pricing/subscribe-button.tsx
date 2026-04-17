'use client';

// Client boundary: handles click, tracks loading state via useTransition,
// and triggers a full-page redirect to Stripe Checkout. None of this is
// expressible in a pure Server Component.

import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { subscribeToPlan } from '@/services/subscription/subscribe-to-plan';
import {
	SUBSCRIPTION_ERROR_CODES,
	type SubscriptionErrorCode,
} from '@/types/errors';

interface SubscribeButtonProps {
	/** Plan to subscribe to. Validated server-side too — this is best-effort. */
	planId: string;
	/** Button label — "Start Starter", "Start Pro", etc. */
	label: string;
	/** Whether the current viewer has an active session. Gates the action. */
	isAuthenticated: boolean;
	/** Controls the dark vs. light card variant styling. */
	variant?: 'primary' | 'secondary';
}

/**
 * Surface label for each error code. Exhaustive switch — TypeScript enforces
 * that every `SubscriptionErrorCode` is handled, so adding a new backend code
 * without wiring user-facing copy here is a compile error, not a silent
 * "Something went wrong". Kept module-scoped so we don't re-allocate per click.
 */
function errorMessage(code: SubscriptionErrorCode): string {
	switch (code) {
		case SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND:
			return 'This plan is no longer available. Please refresh and try again.';
		case SUBSCRIPTION_ERROR_CODES.ALREADY_SUBSCRIBED:
			return "You're already subscribed. Manage your plan from your profile.";
		case SUBSCRIPTION_ERROR_CODES.CHECKOUT_FAILED:
			return "We couldn't start checkout. Please try again in a moment.";
		case SUBSCRIPTION_ERROR_CODES.NOT_FOUND:
		case SUBSCRIPTION_ERROR_CODES.NOT_ACTIVE:
		case SUBSCRIPTION_ERROR_CODES.ENROLLMENT_CONFLICT:
			return 'There was a problem with your subscription. Please contact support.';
		case SUBSCRIPTION_ERROR_CODES.FETCH_FAILED:
			return "Something went wrong on our end. We've been notified.";
		case 'global:auth:unauthenticated':
		case 'unauthorized':
		case 'session_expired':
			return 'Please sign in to subscribe.';
		case 'global:ratelimit:exceeded':
			return 'Too many requests — please wait a moment and try again.';
		case 'network_error':
		case 'timeout_error':
		case 'connection_aborted':
			return 'Network trouble — check your connection and try again.';
		case 'forbidden':
		case 'invalid_request':
		case 'validation_error':
		case 'internal_server_error':
		case 'service_unavailable':
		case 'unknown_error':
		case 'global:upload:file-too-large':
		case 'global:upload:invalid-image':
		case 'global:upload:invalid-file-type':
		case 'global:upload:invalid-content-type':
		case 'global:upload:missing-boundary':
		case 'global:upload:no-file':
			return "We couldn't start checkout. Please try again.";
		default: {
			// Exhaustiveness guard — any new code added to SubscriptionErrorCode
			// that isn't mapped above will fail the type check here.
			const _exhaustive: never = code;
			return _exhaustive;
		}
	}
}

/**
 * Per-plan "Start <plan>" CTA. Triggers the subscription server action, then
 * redirects the browser to the Stripe-hosted checkout URL the backend returns.
 *
 * Unauthenticated click routes to /sign-in with a `returnTo` pointing back to
 * /pricing, so the user lands on this page already signed in and can retry
 * the click without re-navigating.
 *
 * Error surface: every mapped code is shown via `sonner` toast. Server-side
 * analytics already captured the failure with plan_id + error_code before the
 * response returned — we deliberately don't double-track on the client.
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

	/**
	 * Handles the click:
	 *   1. If anonymous, bounce to sign-in with `returnTo=/pricing` so they
	 *      land back here already signed in — no lost intent.
	 *   2. Otherwise, call the server action and redirect on success.
	 *   3. On failure, show the mapped toast and stay on page.
	 */
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
				toast.error(errorMessage(result.error));
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
