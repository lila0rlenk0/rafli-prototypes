'use client';

import { Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import { createOrder } from '@/services/order/create-order';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';
import type { OrderErrorCode, PaymentErrorCode, PromoCodeErrorCode } from '@/types/errors';

interface BuyButtonProps {
	raffleId: string;
	publicSlug: string;
	ticketQuantity: number;
	disabled?: boolean;
	questionId?: string | null;
	promoCode?: string;
	isFreeTickets?: boolean;
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
 *
 * @param raffleId - The UUID of the raffle (used for API calls)
 * @param publicSlug - The public slug of the raffle (used for redirect URLs)
 * @param ticketQuantity - Number of tickets to purchase
 * @param disabled - Whether the button is disabled
 * @param questionId - Optional question ID for skill-based raffles
 * @param promoCode - Optional validated promo code to apply to order
 * @param isFreeTickets - Whether this is a free tickets redemption
 */
export function BuyButton({
	raffleId,
	publicSlug,
	ticketQuantity,
	disabled = false,
	questionId,
	promoCode,
	isFreeTickets = false,
}: BuyButtonProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [showQuestionModal, setShowQuestionModal] = useState(false);

	/**
	 * Gets user-friendly error message for order errors
	 * @param errorCode - The order error code
	 * @returns User-friendly error message
	 */
	function getOrderErrorMessage(errorCode: OrderErrorCode): string {
		switch (errorCode) {
			case 'core:raffle:not-active':
				return 'This raffle is not currently active';
			case 'core:raffle:sold-out':
				return 'Not enough tickets available';
			case 'core:order:invalid-quantity':
				return 'Invalid ticket quantity';
			case 'network_error':
				return 'Network error. Please check your connection';
			case 'timeout_error':
				return 'Request timed out. Please try again';
			case 'global:auth:unauthenticated':
			case 'unauthorized':
				return 'Please sign in to continue';
			default:
				return 'Failed to create order. Please try again';
		}
	}

	/**
	 * Gets user-friendly error message for payment errors
	 * @param errorCode - The payment error code
	 * @returns User-friendly error message
	 */
	function getPaymentErrorMessage(errorCode: PaymentErrorCode): string {
		switch (errorCode) {
			case 'payments:session:already-completed':
				return 'This order has already been paid';
			case 'core:order:not-found':
				return 'Order not found';
			case 'core:order:permission-denied':
				return 'You do not have access to this order';
			case 'network_error':
				return 'Network error. Please check your connection';
			case 'timeout_error':
				return 'Request timed out. Please try again';
			case 'validation_error':
				return 'Invalid request. Please try again';
			default:
				return 'Failed to start checkout. Please try again';
		}
	}

	/**
	 * Gets user-friendly error message for promo code redemption errors
	 * @param errorCode - The promo code error code
	 * @returns User-friendly error message
	 */
	function getPromoErrorMessage(errorCode: PromoCodeErrorCode): string {
		switch (errorCode) {
			case 'core:promo:not-found':
				return 'Invalid promo code';
			case 'core:promo:expired':
				return 'This code has expired';
			case 'core:promo:max-uses-reached':
				return 'This code has reached its usage limit';
			case 'core:promo:deactivated':
				return 'This code is no longer active';
			case 'core:promo:already-redeemed':
				return 'You have already used this code';
			case 'core:promo:host-cannot-redeem':
				return 'You cannot use codes on your own raffle';
			case 'core:promo:question-required':
				return 'Please answer the question first';
			case 'core:raffle:not-live':
				return 'This raffle is not currently active';
			case 'network_error':
				return 'Network error. Please check your connection';
			case 'timeout_error':
				return 'Request timed out. Please try again';
			default:
				return 'Failed to redeem code. Please try again';
		}
	}

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
	 * Called for free_tickets type promos - skips order/checkout flow
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
				const message = getPromoErrorMessage(result.error);
				toast.error(message);
				return;
			}

			const { ticketsGranted } = result.data;
			const ticketText = ticketsGranted === 1 ? 'ticket' : 'tickets';
			toast.success(`You received ${ticketsGranted} free ${ticketText}!`);

			// Refresh page to show updated ticket count
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
			// Step 1: Create order
			const orderResult = await createOrder({
				raffleId,
				ticketQuantity,
				...(promoCode && { promoCode }),
			});

			if (!orderResult.success) {
				const message = getOrderErrorMessage(orderResult.error);
				toast.error(message);
				return;
			}

			const order = orderResult.data;

			// Step 2: Create checkout session
			const checkoutResult = await createCheckoutSession({
				orderId: order.id,
				raffleId,
				publicSlug,
			});

			if (!checkoutResult.success) {
				const message = getPaymentErrorMessage(checkoutResult.error);
				toast.error(message);
				return;
			}

			const session = checkoutResult.data;

			// Step 3: Redirect to Stripe checkout
			window.location.href = session.checkoutUrl;
		} catch (error) {
			console.error('Unexpected error during checkout:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			setIsLoading(false);
		}
	}

	function getButtonText() {
		if (isLoading) {
			return 'Processing...';
		}

		if (isFreeTickets) {
			return `Claim free ticket${ticketQuantity > 1 ? 's' : ''}`;
		}

		return `Buy ticket${ticketQuantity > 1 ? 's' : ''}`;
	}

	return (
		<>
			<Button
				onClick={handleBuyClick}
				disabled={isLoading || disabled}
				className="w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
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
