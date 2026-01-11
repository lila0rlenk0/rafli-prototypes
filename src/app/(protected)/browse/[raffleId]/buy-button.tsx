'use client';

import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { createOrder } from '@/services/order/create-order';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';
import type { OrderErrorCode, PaymentErrorCode } from '@/types/errors';

interface BuyButtonProps {
	raffleId: string;
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
export function BuyButton({ raffleId }: BuyButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

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
	 * Handles the buy button click
	 * Creates order and checkout session, then redirects to Stripe
	 */
	async function handleBuyClick() {
		setIsLoading(true);

		try {
			// Step 1: Create order
			const orderResult = await createOrder({
				raffleId,
				ticketQuantity: 1, // Initially fixed at 1, parameterized later
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

	return (
		<Button
			onClick={handleBuyClick}
			disabled={isLoading}
			className="w-full bg-black"
		>
			{isLoading ? (
				<>
					<Loader2Icon className="mr-2 size-4 animate-spin" />
					Processing...
				</>
			) : (
				'Buy Ticket'
			)}
		</Button>
	);
}
