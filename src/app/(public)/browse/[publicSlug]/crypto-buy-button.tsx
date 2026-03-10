'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2Icon, WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

import { CryptoCheckoutModal } from '@/components/payment/crypto-checkout-modal';
import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import {
	getOrderErrorMessage,
	getPromoErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { getReusablePendingOrder } from '@/lib/checkout/order-reuse';
import { createOrder } from '@/services/order/create-order';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';
import { validatePromoCode } from '@/services/promo-code/validate-promo-code';

// ==========================================
// Types
// ==========================================

interface CryptoBuyButtonProps {
	raffleId: string;
	ticketQuantity: number;
	disabled?: boolean;
	questionId?: string | null;
	promoCode?: string;
	isFreeTickets?: boolean;
	onPromoInvalid?: () => void;
	cryptoChainIds: number[];
	userId?: string | null;
}

// ==========================================
// Component
// ==========================================

/**
 * CryptoBuyButton Component
 *
 * Secondary purchase button for crypto payments via Web3 wallet.
 * Flow:
 * 1. Click → opens RainbowKit wallet connect modal if not connected
 * 2. Once connected → creates order and opens crypto checkout modal
 * 3. Crypto checkout modal handles chain selection, wallet verify, and ERC20 transfer
 */
export function CryptoBuyButton({
	raffleId,
	ticketQuantity,
	disabled = false,
	questionId,
	promoCode,
	isFreeTickets = false,
	onPromoInvalid,
	cryptoChainIds,
	userId,
}: CryptoBuyButtonProps) {
	const router = useRouter();
	const { openConnectModal } = useConnectModal();
	const { isConnected } = useAccount();

	const [isLoading, setIsLoading] = useState(false);
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [showCryptoModal, setShowCryptoModal] = useState(false);
	const [cryptoOrderId, setCryptoOrderId] = useState<string | null>(null);
	// Tracks whether we should auto-proceed after wallet connects
	const [pendingCheckout, setPendingCheckout] = useState(false);

	// ==========================================
	// Checkout Flow
	// ==========================================

	/**
	 * Creates order and opens crypto checkout modal
	 * Mirrors BuyButton.proceedToCheckout but routes to crypto modal instead of Stripe
	 */
	const proceedToCryptoCheckout = useCallback(async () => {
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
				// Step 2: Re-validate promo just before checkout
				if (promoCode && !isFreeTickets) {
					const validationResult = await validatePromoCode(raffleId, promoCode);
					if (!validationResult.success) {
						toast.error(getPromoErrorMessage(validationResult.error));
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

				// Step 4: Apply promo to order if needed
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
							toast.error(getPromoErrorMessage(redeemResult.error));
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

			// Step 5: Open crypto checkout modal
			setCryptoOrderId(order.id);
			setShowCryptoModal(true);
		} catch (error) {
			console.error('Unexpected error during crypto checkout:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			setIsLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [raffleId, ticketQuantity, promoCode, isFreeTickets]);

	// ==========================================
	// Auto-proceed after wallet connection
	// ==========================================

	/**
	 * When user connects wallet after clicking the button,
	 * automatically proceed to crypto checkout
	 */
	useEffect(() => {
		if (pendingCheckout && isConnected) {
			setPendingCheckout(false);
			proceedToCryptoCheckout();
		}
	}, [pendingCheckout, isConnected, proceedToCryptoCheckout]);

	// ==========================================
	// Handlers
	// ==========================================

	/**
	 * Main click handler
	 * - If question required → show question modal first
	 * - If wallet not connected → open RainbowKit connect modal, then auto-proceed
	 * - If wallet connected → create order and open crypto checkout
	 */
	function handleClick() {
		if (questionId) {
			setShowQuestionModal(true);
			return;
		}
		startCryptoFlow();
	}

	/**
	 * Starts the crypto payment flow
	 * Opens wallet connect if needed, otherwise proceeds directly
	 */
	function startCryptoFlow() {
		if (!isConnected) {
			setPendingCheckout(true);
			openConnectModal?.();
			return;
		}
		proceedToCryptoCheckout();
	}

	/**
	 * Handles correct answer from question modal
	 */
	function handleCorrectAnswer() {
		startCryptoFlow();
	}

	// ==========================================
	// Button Text
	// ==========================================

	/**
	 * Gets button label based on wallet connection state
	 */
	function getButtonText(): string {
		if (isLoading) return 'Processing...';
		if (isFreeTickets) return 'Claim with wallet';
		if (!isConnected) return 'Connect wallet to buy';
		return 'Buy with crypto';
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<>
			<Button
				onClick={handleClick}
				disabled={isLoading || disabled}
				variant="outline"
				className="h-12 w-full cursor-pointer border-2 border-black bg-white text-black hover:bg-black hover:text-white"
			>
				{isLoading ? (
					<Loader2Icon className="mr-2 size-4 animate-spin" />
				) : (
					<WalletIcon className="mr-2 size-4" />
				)}
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

			{cryptoOrderId && (
				<CryptoCheckoutModal
					open={showCryptoModal}
					onOpenChange={setShowCryptoModal}
					orderId={cryptoOrderId}
					cryptoChainIds={cryptoChainIds}
					userId={userId}
					onSuccess={() => router.refresh()}
				/>
			)}
		</>
	);
}
