'use client';

import { Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import {
	getPaymentErrorMessage,
	getPromoErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';
import { cancelPaymentSession } from '@/services/payment/cancel-payment-session';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';

/**
 * Props for BuyButton
 */
interface BuyButtonProps {
	raffleId: string;
	publicSlug: string;
	ticketQuantity: number;
	disabled?: boolean;
	questionId?: string | null;
	promoCode?: string;
	isFreeTickets?: boolean;
	onPromoInvalid?: () => void;
	onPromoRedeemed?: () => void;
}

/**
 * BuyButton Component
 *
 * Handles the ticket purchase flow:
 * 1. Creates order via shared buildCheckoutOrder (with promo handling)
 * 2. Creates Stripe checkout session
 * 3. Redirects to Stripe checkout page
 *
 * Shows loading states and error messages during the process.
 */
export function BuyButton({
	raffleId,
	publicSlug,
	ticketQuantity,
	disabled = false,
	questionId,
	promoCode,
	isFreeTickets = false,
	onPromoInvalid,
	onPromoRedeemed,
}: BuyButtonProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [showQuestionModal, setShowQuestionModal] = useState(false);

	/**
	 * Handles the buy button click
	 * Routes to appropriate flow based on ticket type
	 */
	function handleBuyClick() {
		if (questionId) {
			setShowQuestionModal(true);
		} else if (isFreeTickets && promoCode) {
			redeemFreeTickets();
		} else {
			proceedToCheckout();
		}
	}

	/**
	 * Handles correct answer from question modal
	 * Routes to appropriate flow after user answers correctly
	 */
	function handleCorrectAnswer() {
		if (isFreeTickets && promoCode) {
			redeemFreeTickets();
		} else {
			proceedToCheckout();
		}
	}

	/**
	 * Redeems free tickets promo code
	 * Called for free_tickets type promos — skips order/checkout flow
	 */
	async function redeemFreeTickets() {
		if (!promoCode) return;

		setIsLoading(true);

		try {
			const result = await redeemPromoCode({
				code: promoCode,
				raffleId,
			});

			if (!result.success) {
				toast.error(getPromoErrorMessage(result.error));
				if (shouldClearPromo(result.error)) {
					onPromoInvalid?.();
				}
				return;
			}

			const { ticketsGranted } = result.data;
			const ticketText = ticketsGranted === 1 ? 'ticket' : 'tickets';
			toast.success(`You received ${ticketsGranted} free ${ticketText}!`);

			onPromoRedeemed?.();
			router.refresh();
		} catch (error) {
			console.error('Unexpected error during redemption:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			setIsLoading(false);
		}
	}

	/**
	 * Creates order via shared buildCheckoutOrder, then redirects to Stripe.
	 * Order creation + promo handling is shared with CryptoBuyButton.
	 */
	async function proceedToCheckout() {
		setIsLoading(true);

		try {
			// Step 1: Build order with promo handling (shared with crypto flow)
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

			// Step 2: Cancel any active payment session on this order before Stripe checkout.
			// Idempotent — safe even if no session exists. Clears cross-method guards so
			// Stripe checkout doesn't fail with "crypto-session-active".
			const cancelResult = await cancelPaymentSession(result.order.id);

			if (!cancelResult.success) {
				// Cancel is the guard-clearing step for method switching.
				// If it fails for any reason, we no longer know whether Stripe/crypto
				// is still active on this order, so stop here with the real error.
				toast.error(getPaymentErrorMessage(cancelResult.error));
				return;
			}

			// Step 3: Create Stripe checkout session and redirect
			const checkoutResult = await createCheckoutSession({
				orderId: result.order.id,
				raffleId,
				publicSlug,
			});

			if (!checkoutResult.success) {
				toast.error(getPaymentErrorMessage(checkoutResult.error));
				return;
			}

			window.location.href = checkoutResult.data.checkoutUrl;
		} catch (error) {
			console.error('Unexpected error during checkout:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			setIsLoading(false);
		}
	}

	/**
	 * Gets button label based on ticket type
	 */
	function getButtonText(): string {
		if (isLoading) return 'Processing...';
		if (isFreeTickets)
			return `Claim free ticket${ticketQuantity > 1 ? 's' : ''}`;
		return `Buy ticket${ticketQuantity > 1 ? 's' : ''}`;
	}

	return (
		<>
			<Button
				onClick={handleBuyClick}
				disabled={isLoading || disabled}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				{isLoading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
				<p className="font-semibold">{getButtonText()}</p>
			</Button>

			{questionId && (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={raffleId}
					onCorrectAnswer={handleCorrectAnswer}
				/>
			)}
		</>
	);
}
