'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2Icon, WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { RaffleQuestionModal } from '@/components/raffle/question-modal/question-modal';
import { Button } from '@/components/ui/button';
import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';
import { getPaymentErrorMessage } from '@/lib/checkout/error-messages';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
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
 * Only shown when user has credits. Disabled with tooltip when balance
 * is insufficient to cover the order total.
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
}: CreditsBuyButtonProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	// Synchronous single-flight guard — mirrors BuyButton pattern
	const checkoutInFlight = useRef(false);

	// Access Pass acknowledgment gate — credit-paid checkout still exchanges
	// consideration for entries, so the same legal gate as the Stripe flow
	// applies. Only the $0 free-tickets path ignores this flag.
	const isAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);

	const balance = parseFloat(availableCredits);
	const hasSufficientBalance = balance >= orderTotal;
	// Free-tickets promos arrive as $0 orders — they don't consume credits
	// and carry no consideration, so acknowledgment doesn't apply there.
	const isGatedByAcknowledgment = orderTotal > 0 && !isAcknowledged;

	/**
	 * Formats a price value with currency symbol
	 */
	function formatPrice(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	}

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

			// $0 order after promo — backend auto-completed, just refresh
			if (result.isFullyDiscounted) {
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
			toast.success('Payment successful! Your entries are confirmed.');
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
	 * Gets button label with balance info
	 */
	function getButtonText(): string {
		if (isLoading) return 'Processing...';
		return `Pay with Credits (${formatPrice(balance)})`;
	}

	/**
	 * Gets tooltip text for disabled states — precedence:
	 * acknowledgment gate > insufficient balance > no tooltip. Precedence
	 * matters because the acknowledgment is the user-actionable fix the
	 * user can resolve on this page, while balance requires a top-up flow.
	 */
	function getTooltipText(): string | undefined {
		if (isGatedByAcknowledgment) {
			return 'Please acknowledge the terms above to continue';
		}
		if (!hasSufficientBalance) {
			return `Insufficient credits (${formatPrice(balance)} available, ${formatPrice(orderTotal)} needed)`;
		}
		return undefined;
	}

	return (
		<>
			<Button
				onClick={handleBuyClick}
				disabled={
					isLoading ||
					disabled ||
					!hasSufficientBalance ||
					isGatedByAcknowledgment
				}
				title={getTooltipText()}
				className="border-brand-mint bg-brand-mint hover:bg-mint-300 h-12 w-full cursor-pointer border-2 text-black hover:text-black"
			>
				{isLoading ? (
					<Loader2Icon className="mr-2 size-4 animate-spin" />
				) : (
					<WalletIcon className="mr-2 size-4" />
				)}
				<p className="font-semibold">{getButtonText()}</p>
			</Button>

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
