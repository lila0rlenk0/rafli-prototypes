import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { toast } from 'sonner';

import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';
import { getPaymentErrorMessage } from '@/lib/checkout/error-messages';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';

/** Module scope — dual-mounted `useStripeCheckout` must share one in-flight guard */
let stripeCheckoutInFlight = false;

interface ProceedToStripeCheckoutOptions {
	raffleId: string;
	publicSlug: string;
	ticketQuantity: number;
	promoCode: string | undefined;
	clearPromo: () => void;
	router: AppRouterInstance;
	setIsLoading: (loading: boolean) => void;
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
}: ProceedToStripeCheckoutOptions): Promise<void> {
	if (stripeCheckoutInFlight) return;
	stripeCheckoutInFlight = true;
	try {
		// Inside `try` so `finally` still clears the module guard if `setIsLoading` throws.
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

		const checkoutResult = await createCheckoutSession({
			orderId: result.order.id,
			publicSlug,
		});

		if (!checkoutResult.success) {
			toast.error(getPaymentErrorMessage(checkoutResult.error));
			return;
		}

		const checkoutUrl = new URL(checkoutResult.data.checkoutUrl);
		if (checkoutUrl.origin !== 'https://checkout.stripe.com') {
			console.error('Unexpected checkout URL origin:', checkoutUrl.origin);
			toast.error('Invalid checkout URL. Please try again');
			return;
		}
		window.location.href = checkoutResult.data.checkoutUrl;
	} catch (error) {
		console.error('Unexpected error during checkout:', error);
		toast.error('An unexpected error occurred. Please try again');
	} finally {
		stripeCheckoutInFlight = false;
		setIsLoading(false);
	}
}
