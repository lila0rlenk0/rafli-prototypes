import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import {
	getPromoErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';

/** Module scope — two hook instances / double-clicks must not race duplicate redeems */
let freeTicketRedeemInFlight = false;

interface RedeemFreeTicketsOptions {
	raffleId: string;
	promoCode: string;
	pathname: string;
	searchParams: ReadonlyURLSearchParams;
	router: AppRouterInstance;
	clearPromo: () => void;
	setIsLoading: (loading: boolean) => void;
}

/**
 * Executes the free-tickets shortcut — calls the redeem endpoint,
 * toasts success or failure, strips `?code=` from the URL (so a
 * refresh doesn't re-apply the now-spent promo), clears the promo
 * from the store, and refreshes the server-rendered ticket counts.
 *
 * Lives outside the hook so the hook body stays under the
 * function-length cap and this flow stays independently unit-testable.
 */
export async function redeemFreeTickets({
	raffleId,
	promoCode,
	pathname,
	searchParams,
	router,
	clearPromo,
	setIsLoading,
}: RedeemFreeTicketsOptions): Promise<void> {
	if (freeTicketRedeemInFlight) return;
	freeTicketRedeemInFlight = true;
	try {
		// Inside `try` so `finally` still clears the module guard if `setIsLoading` throws
		// (e.g. state setter from an unmounted host) — pre-`try` placement would leak `true`.
		setIsLoading(true);
		const result = await redeemPromoCode({ code: promoCode, raffleId });

		if (!result.success) {
			toast.error(getPromoErrorMessage(result.error));
			if (shouldClearPromo(result.error)) clearPromo();
			return;
		}

		const { ticketsGranted } = result.data;
		const entryText = ticketsGranted === 1 ? 'entry' : 'entries';
		toast.success(`You received ${ticketsGranted} free ${entryText}!`);

		// Strip the spent code from the URL without a Next.js navigation
		// so we don't unmount mid-success-toast.
		const nextParams = new URLSearchParams(searchParams.toString());
		nextParams.delete('code');
		const nextUrl = nextParams.toString()
			? `${pathname}?${nextParams.toString()}`
			: pathname;
		window.history.replaceState(null, '', nextUrl);

		clearPromo();
		router.refresh();
	} catch (error) {
		console.error('Unexpected error during redemption:', error);
		toast.error('An unexpected error occurred. Please try again');
	} finally {
		freeTicketRedeemInFlight = false;
		setIsLoading(false);
	}
}
