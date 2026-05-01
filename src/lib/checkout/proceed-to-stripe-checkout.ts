import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { toast } from 'sonner';

import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';
import { getPaymentErrorMessage } from '@/lib/checkout/error-messages';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';

/** Module scope — dual-mounted `useStripeCheckout` must share one in-flight guard */
let stripeCheckoutInFlight = false;

/**
 * Tolerance for the displayed-vs-charged comparison (in major currency units).
 *
 * 0.005 = half a cent. Strict equality on floats is fragile due to JS scale-2 ↔ scale-4
 * round-trips: the FE math runs scaled-int (exact) but `OrderTotal.total` is a `number`.
 * 0.5¢ is tighter than any rounding mode could produce while still tolerating IEEE-754
 * representation drift on amounts like $123.4500.
 */
const TOTAL_VERIFICATION_TOLERANCE = 0.005;

interface ProceedToStripeCheckoutOptions {
	raffleId: string;
	publicSlug: string;
	ticketQuantity: number;
	promoCode: string | undefined;
	clearPromo: () => void;
	router: AppRouterInstance;
	setIsLoading: (loading: boolean) => void;
	/**
	 * Displayed total (post-promo, post-subscriber-discount) as the user sees it on the
	 * CTA. Compared against the BE-returned `order.totalAmount` after build — divergence
	 * means the user's pricing context (subscription / promo) shifted between page load
	 * and click, and we must refresh rather than redirect to a Stripe page that would
	 * charge an amount the user didn't agree to.
	 */
	expectedTotal: number;
}

/**
 * Standard paid-checkout flow — build order (with promo handling),
 * create a Stripe checkout session, redirect to Stripe's hosted page.
 * Single-flight guarded at module scope so dual `useStripeCheckout` mounts
 * (mobile sticky + desktop card) cannot start two checkouts.
 *
 * `$0 after promo` short-circuits to `router.refresh()` because the
 * backend auto-completes those orders server-side. A malformed
 * checkout URL aborts with a toast instead of redirecting — open
 * redirect defence even if the upstream payload were ever compromised.
 */
export async function proceedToStripeCheckout({
	raffleId,
	publicSlug,
	ticketQuantity,
	promoCode,
	clearPromo,
	router,
	setIsLoading,
	expectedTotal,
}: ProceedToStripeCheckoutOptions): Promise<void> {
	if (stripeCheckoutInFlight) return;
	stripeCheckoutInFlight = true;
	// `try/finally` (no catch) — `buildCheckoutOrder` and `createCheckoutSession`
	// return typed results, never throw, so a top-level catch would only swallow
	// real bugs. The finally clears the module guard even if `setIsLoading` itself
	// throws, so a fragile parent can't lock the dual-mounted hooks out of retry.
	try {
		setIsLoading(true);
		const result = await buildCheckoutOrder({
			raffleId,
			ticketQuantity,
			promoCode,
			onPromoInvalid: clearPromo,
		});

		// Null means error — buildCheckoutOrder already toasted.
		if (!result) return;

		// $0 order after promo — backend auto-completed, just refresh.
		if (result.isFullyDiscounted) {
			router.refresh();
			return;
		}

		// Pricing-drift guard — see TOTAL_VERIFICATION_TOLERANCE doc.
		// The BE-returned `totalAmount` is the source of truth for what Stripe will charge.
		// If it diverges from what the FE just rendered (subscription change mid-session,
		// stale order reused before B5 caught it, etc.) refresh the page so the user
		// re-confirms the new total instead of being redirected to a Stripe page that
		// would charge an amount they didn't agree to.
		// Polarity is "proceed only when both sides parse cleanly AND agree within
		// tolerance" — a NaN either side means we can't compare safely, so refresh
		// rather than silently fall through to checkout.
		const chargedTotal = parseFloat(result.order.totalAmount);
		const totalsMatch =
			Number.isFinite(chargedTotal) &&
			Number.isFinite(expectedTotal) &&
			Math.abs(chargedTotal - expectedTotal) <= TOTAL_VERIFICATION_TOLERANCE;
		if (!totalsMatch) {
			toast.error(
				'Price updated. Please review the new total before continuing.',
			);
			router.refresh();
			return;
		}

		const checkoutResult = await createCheckoutSession({
			orderId: result.order.id,
			publicSlug,
		});

		if (!checkoutResult.success) {
			toast.error(getPaymentErrorMessage(checkoutResult.error));
			return;
		}

		// URL constructor will throw on garbage strings; the upstream service action
		// already validates a URL is returned, so any throw here is a contract drift
		// bug worth surfacing rather than a user-facing case. Origin lockdown is the
		// open-redirect defence even if the upstream payload were ever compromised.
		const checkoutUrl = new URL(checkoutResult.data.checkoutUrl);
		if (checkoutUrl.origin !== 'https://checkout.stripe.com') {
			toast.error('Invalid checkout URL. Please try again');
			return;
		}
		window.location.href = checkoutResult.data.checkoutUrl;
	} finally {
		stripeCheckoutInFlight = false;
		setIsLoading(false);
	}
}
