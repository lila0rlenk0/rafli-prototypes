'use client';

import { Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import {
	getOrderErrorMessage,
	getPaymentErrorMessage,
	getPromoErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { getReusablePendingOrder } from '@/lib/checkout/order-reuse';
import { createOrder } from '@/services/order/create-order';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';
import { validatePromoCode } from '@/services/promo-code/validate-promo-code';

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
 * 1. Creates order with backend
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
		// Step 1: Route to question modal if required.
		if (questionId) {
			setShowQuestionModal(true);
		} else if (isFreeTickets && promoCode) {
			// Step 2: Redeem free tickets directly.
			redeemFreeTickets();
		} else {
			// Step 3: Continue to checkout.
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
	 * Called for free_tickets type promos - skips order/checkout flow
	 */
	async function redeemFreeTickets() {
		if (!promoCode) return;

		setIsLoading(true);

		try {
			// Step 1: Redeem code with backend.
			const result = await redeemPromoCode({
				code: promoCode,
				raffleId,
			});

			if (!result.success) {
				const message = getPromoErrorMessage(result.error);
				toast.error(message);
				if (shouldClearPromo(result.error)) {
					onPromoInvalid?.();
				}
				return;
			}

			// Step 2: Notify and refresh.
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
	 * Creates order and checkout session, then redirects to Stripe
	 */
	async function proceedToCheckout() {
		setIsLoading(true);

		try {
			// Step 1: Reuse existing pending order if possible
			let order = await getReusablePendingOrder(
				raffleId,
				ticketQuantity,
				promoCode,
			);

			const promoAlreadyApplied =
				promoCode && !isFreeTickets && order?.promoCode === promoCode;

			if (!promoAlreadyApplied) {
				// Step 2: Re-validate promo just before checkout to avoid stale codes
				if (promoCode && !isFreeTickets) {
					const validationResult = await validatePromoCode(raffleId, promoCode);
					if (!validationResult.success) {
						const message = getPromoErrorMessage(validationResult.error);
						toast.error(message);
						if (shouldClearPromo(validationResult.error)) {
							onPromoInvalid?.();
						}
						return;
					}
				}

				// Step 3: Create order if none exists
				if (!order) {
					const orderResult = await createOrder({
						raffleId,
						ticketQuantity,
					});

					if (!orderResult.success) {
						toast.error(getOrderErrorMessage(orderResult.error));
						return;
					}

					order = orderResult.data;
				}

				// Step 4: Apply discount promo to pending order (free tickets handled separately)
				if (promoCode && !isFreeTickets) {
					if (order.promoCode && order.promoCode !== promoCode) {
						toast.error(
							'A different promo code is already applied to this order',
						);
						onPromoInvalid?.();
						return;
					}

					if (order.promoCode !== promoCode) {
						const redeemResult = await redeemPromoCode({
							code: promoCode,
							raffleId,
							orderId: order.id,
						});

						if (!redeemResult.success) {
							const message = getPromoErrorMessage(redeemResult.error);
							toast.error(message);
							if (shouldClearPromo(redeemResult.error)) {
								onPromoInvalid?.();
							}
							return;
						}

						const discountAmount = parseFloat(
							redeemResult.data.discountAmount ?? '0',
						);
						const orderTotal = parseFloat(order.totalAmount);
						const remainingTotal = Math.max(0, orderTotal - discountAmount);

						// Backend auto-completes $0 orders after promo redemption
						if (remainingTotal === 0) {
							toast.success('Promo applied. Tickets claimed successfully!');
							router.refresh();
							return;
						}
					}
				}
			}

			if (!order) {
				toast.error('Failed to create order. Please try again');
				return;
			}

			// Step 5: Create Stripe checkout session and redirect
			const checkoutResult = await createCheckoutSession({
				orderId: order.id,
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
