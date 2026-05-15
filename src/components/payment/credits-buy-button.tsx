'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Contrast } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
	TenderRow,
	type TenderRowVariant,
} from '@/components/payment/tender-row';
import { RaffleQuestionModal } from '@/components/raffle/question-modal/question-modal';
import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';
import { getPaymentErrorMessage } from '@/lib/checkout/error-messages';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { abandonOrder } from '@/services/payment/abandon-order';
import { creditBalanceKey } from '@/services/payment/use-credit-balance';
import { payWithCredits } from '@/services/payment/pay-with-credits';

/**
 * Props for CreditsBuyButton
 */
interface CreditsBuyButtonProps {
	raffleId: string;
	ticketQuantity: number;
	disabled?: boolean;
	questionId?: string | null;
	promoCode?: string;
	onPromoInvalid?: () => void;
	/** User's available credit balance as decimal string */
	availableCredits: string;
	/** Order total in dollars (after promo discount) */
	orderTotal: number;
	/** Currency code for display (e.g. "USD") */
	currency: string;
	/** Picker slot variant — `selected` when the picker is promoting Credits
	 *  as the default-action tender (sufficient balance), `unselected`
	 *  otherwise. */
	variant?: TenderRowVariant;
	/**
	 * Called after the credits payment settles (success or $0 auto-complete).
	 * The desktop picker uses this to swap itself out for the entries-confirmed
	 * modal so the user gets a single, consistent confirmation surface instead
	 * of a fleeting toast. When omitted, the legacy toast UX is preserved
	 * (mobile inline rendering relies on this fallback).
	 */
	onSuccess?: () => void;
}

/**
 * CreditsBuyButton Component
 *
 * Handles ticket purchase using platform credits:
 * 1. Creates order via shared buildCheckoutOrder (with promo handling)
 * 2. Auto-abandons any pending Stripe/crypto session on the order
 * 3. Pays instantly using POST /payments/credits/pay
 * 4. Refreshes page on success — no modal, no redirect, no polling
 *
 * Renders as a `TenderRow` inside the payment picker. The row's
 * description surfaces the live credit balance so the user can compare
 * it against the picker's Total at a glance without opening a tooltip.
 * Insufficient-balance state stays operable (the row disables itself)
 * but the tooltip and description stay informative.
 */
export function CreditsBuyButton({
	raffleId,
	ticketQuantity,
	disabled = false,
	questionId,
	promoCode,
	onPromoInvalid,
	availableCredits,
	orderTotal,
	currency,
	variant = 'unselected',
	onSuccess,
}: CreditsBuyButtonProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	// Synchronous single-flight guard — mirrors BuyButton pattern
	const checkoutInFlight = useRef(false);

	const balance = parseFloat(availableCredits);
	const hasSufficientBalance = balance >= orderTotal;

	/**
	 * Handles the buy button click.
	 * Routes to question modal if required, otherwise proceeds directly.
	 */
	function handleBuyClick() {
		track(PURCHASE_EVENTS.TICKET_SELECTION_VIEWED, {
			raffle_id: raffleId,
			quantity: ticketQuantity,
			payment_method: 'credits',
			has_promo: !!promoCode,
			available_credits: availableCredits,
			order_total: orderTotal,
		});

		if (questionId) {
			setShowQuestionModal(true);
			return;
		}

		proceedToCheckout();
	}

	/**
	 * Handles correct answer from question modal
	 */
	function handleCorrectAnswer() {
		proceedToCheckout();
	}

	/**
	 * Invalidates the shared credit balance cache so navbar badge
	 * and button state reflect the latest balance.
	 */
	function invalidateCreditBalance() {
		void queryClient.invalidateQueries({ queryKey: creditBalanceKey() });
	}

	/**
	 * Creates order, abandons any competing payment session, then pays with credits.
	 *
	 * The abandon step is critical: if the user previously clicked "Enter now" (Stripe),
	 * a pending Stripe session blocks credit spend. Calling abandonOrder cancels it
	 * (Stripe.checkout.sessions.expire on backend), allowing credits to proceed.
	 *
	 * If abandon fails because a crypto tx is confirming, we surface the error and stop —
	 * we must not cancel an in-flight on-chain transaction.
	 */
	async function proceedToCheckout() {
		if (checkoutInFlight.current) return;
		checkoutInFlight.current = true;
		setIsLoading(true);

		try {
			// Step 1: Build order with promo handling (shared with Stripe/crypto flows)
			const result = await buildCheckoutOrder({
				raffleId,
				ticketQuantity,
				promoCode,
				onPromoInvalid,
			});

			// Null means error — already toasted by buildCheckoutOrder
			if (!result) return;

			// $0 order after promo — backend auto-completed, just refresh.
			// `onSuccess` (when provided) hands off to the entries-confirmed
			// modal in the desktop picker; without it, the toast/refresh
			// fallback below is the only feedback surface.
			if (result.isFullyDiscounted) {
				if (onSuccess) {
					onSuccess();
				}
				router.refresh();
				return;
			}

			// Step 2: Auto-abandon any pending Stripe/crypto session on this order.
			// Idempotent — returns { abandoned: false } when no session exists.
			const abandonResult = await abandonOrder(result.order.id, 'credits');

			if (!abandonResult.success) {
				// payments:abandon:crypto-active → crypto tx confirming, can't cancel
				toast.error(getPaymentErrorMessage(abandonResult.error));
				return;
			}

			// Step 3: Pay with credits — instant settlement
			const payResult = await payWithCredits(result.order.id);

			if (!payResult.success) {
				toast.error(getPaymentErrorMessage(payResult.error));
				return;
			}

			// Step 4: Success — refresh to show updated tickets and balance.
			// Balance invalidation happens in finally block for all paths.
			// When `onSuccess` is wired (desktop picker), the entries-confirmed
			// modal owns the celebration moment so the toast would be a
			// duplicate; mobile inline still surfaces it.
			if (onSuccess) {
				onSuccess();
			} else {
				toast.success('Payment successful! Your entries are confirmed.');
			}
			router.refresh();
		} catch (error) {
			console.error('Unexpected error during credit checkout:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			// Always refresh balance on completion — catches insufficient-balance
			// and other errors so button state updates immediately
			invalidateCreditBalance();
			checkoutInFlight.current = false;
			setIsLoading(false);
		}
	}

	/**
	 * Tooltip copy for the insufficient-balance disabled state. The Access
	 * Pass acknowledgment gate lives upstream on the trigger that opens
	 * the picker, so by the time this row renders the consent step has
	 * already been resolved — only the balance shortfall remains.
	 */
	function getTooltipText(): string | undefined {
		if (!hasSufficientBalance) {
			return `Insufficient credits (${formatCurrency(balance, currency)} available, ${formatCurrency(orderTotal, currency)} needed)`;
		}
		return undefined;
	}

	// Description surfaces the live balance — the picker's Total row prints
	// the order amount once at the top, so per-tender descriptions stay
	// orthogonal (balance here, wallet status on crypto, etc.).
	const description = `Balance ${formatCurrency(balance, currency)}`;

	return (
		<>
			<TenderRow
				variant={variant}
				icon={<Contrast className="size-4" aria-hidden />}
				label="Credits"
				badge="Instant"
				description={description}
				isLoading={isLoading}
				disabled={disabled || !hasSufficientBalance}
				title={getTooltipText()}
				onClick={handleBuyClick}
			/>

			{questionId ? (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={raffleId}
					onCorrectAnswer={handleCorrectAnswer}
				/>
			) : null}
		</>
	);
}
