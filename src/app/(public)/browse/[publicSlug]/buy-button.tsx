'use client';

import { Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import { createOrder } from '@/services/order/create-order';
import { getMyOrders } from '@/services/order/get-my-orders';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';
import { validatePromoCode } from '@/services/promo-code/validate-promo-code';
import type {
	OrderErrorCode,
	PaymentErrorCode,
	PromoCodeErrorCode,
} from '@/types/errors';
import { ORDER_STATUS, type OrderWithRaffle } from '@/types/order';

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
	onPromoInvalid,
	onPromoRedeemed,
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
			case 'core:raffle:user-ticket-limit-exceeded':
				return 'You reached the maximum tickets per user for this raffle';
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
			case 'core:promo:order-already-discounted':
				return 'This order already has a promo code';
			case 'core:raffle:not-live':
				return 'This raffle is not currently active';
			case 'core:order:not-found':
				return 'Order not found';
			case 'core:order:not-pending':
				return 'This order can no longer be updated';
			case 'core:order:permission-denied':
				return 'You do not have access to this order';
			case 'global:validation:invalid-argument':
			case 'invalid_code':
			case 'validation_error':
				return 'Invalid promo code request';
			case 'global:auth:unauthenticated':
			case 'unauthorized':
				return 'Please sign in to continue';
			case 'network_error':
				return 'Network error. Please check your connection';
			case 'timeout_error':
				return 'Request timed out. Please try again';
			default:
				return 'Failed to redeem code. Please try again';
		}
	}

	/**
	 * Determines if promo should be cleared from UI after an error.
	 * Only clear for deterministic business errors, not transient network issues.
	 */
	function shouldClearPromo(errorCode: PromoCodeErrorCode): boolean {
		switch (errorCode) {
			case 'core:promo:not-found':
			case 'core:promo:expired':
			case 'core:promo:max-uses-reached':
			case 'core:promo:deactivated':
			case 'core:promo:already-redeemed':
			case 'core:promo:host-cannot-redeem':
			case 'core:promo:raffle-mismatch':
			case 'core:promo:order-already-discounted':
			case 'global:validation:invalid-argument':
			case 'invalid_code':
				return true;
			default:
				return false;
		}
	}

	/**
	 * Checks if order matches raffle and quantity requirements
	 */
	function matchesRaffleAndQuantity(order: OrderWithRaffle): boolean {
		return (
			order.raffleId === raffleId && order.ticketQuantity === ticketQuantity
		);
	}

	/**
	 * Checks if order promo code is compatible with selected code
	 */
	function hasCompatiblePromoCode(
		order: OrderWithRaffle,
		selectedPromoCode?: string,
	): boolean {
		if (!selectedPromoCode) {
			return order.promoCode === null;
		}
		return order.promoCode === null || order.promoCode === selectedPromoCode;
	}

	/**
	 * Checks if order can be reused for checkout
	 */
	function isReusableOrder(
		order: OrderWithRaffle,
		selectedPromoCode?: string,
	): boolean {
		if (order.status !== ORDER_STATUS.PENDING) {
			return false;
		}
		if (!matchesRaffleAndQuantity(order)) {
			return false;
		}
		return hasCompatiblePromoCode(order, selectedPromoCode);
	}

	/**
	 * Gets existing pending order for same raffle + quantity.
	 * Reuses pending orders to avoid creating duplicates on retries.
	 */
	async function getReusablePendingOrder(
		selectedPromoCode?: string,
	): Promise<OrderWithRaffle | null> {
		const ordersResult = await getMyOrders({ page: 1, limit: 100 });

		if (!ordersResult.success) {
			return null;
		}

		const reusableOrder = ordersResult.data.items.find(order =>
			isReusableOrder(order, selectedPromoCode),
		);

		return reusableOrder ?? null;
	}

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
		// Step 1: Continue flow after correct answer.
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
				// Step 2: Surface error and clear promo if needed.
				const message = getPromoErrorMessage(result.error);
				toast.error(message);
				if (shouldClearPromo(result.error)) {
					onPromoInvalid?.();
				}
				return;
			}

			// Step 3: Notify and refresh.
			const { ticketsGranted } = result.data;
			const ticketText = ticketsGranted === 1 ? 'ticket' : 'tickets';
			toast.success(`You received ${ticketsGranted} free ${ticketText}!`);

			onPromoRedeemed?.();

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
			// Step 1: Reuse existing pending order if possible
			let order = await getReusablePendingOrder(promoCode);

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
						const message = getOrderErrorMessage(orderResult.error);
						toast.error(message);
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

			// Step 5: Create checkout session
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

			// Step 6: Redirect to Stripe checkout
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
