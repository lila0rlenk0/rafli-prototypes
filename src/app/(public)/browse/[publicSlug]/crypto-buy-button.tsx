'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2Icon, WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { CryptoCheckoutModal } from '@/components/payment/crypto-checkout-modal';
import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';

// ==========================================
// Types
// ==========================================

interface CryptoBuyButtonProps {
	raffleId: string;
	ticketQuantity: number;
	disabled?: boolean;
	questionId?: string | null;
	promoCode?: string;

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
	 * Creates order and opens crypto checkout modal.
	 * Uses shared buildCheckoutOrder for order creation + promo handling,
	 * then opens modal for the resulting order.
	 */
	const proceedToCryptoCheckout = useCallback(async () => {
		setIsLoading(true);

		try {
			// Build order with promo handling (shared with Stripe flow)
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

			// Open crypto checkout modal with the order
			setCryptoOrderId(result.order.id);
			setShowCryptoModal(true);
		} catch (error) {
			console.error('Unexpected error during crypto checkout:', error);
		} finally {
			setIsLoading(false);
		}
	}, [raffleId, ticketQuantity, promoCode, onPromoInvalid, router]);

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

	/**
	 * Safety timeout — clears pendingCheckout after 30s if wallet never connects.
	 * Prevents stale state if user dismisses the RainbowKit modal without connecting.
	 */
	useEffect(() => {
		if (!pendingCheckout) return;

		// 30s is tight enough to prevent ghost orders from stale intent,
		// but long enough for slow WalletConnect QR scans on mobile
		const timeout = setTimeout(() => {
			setPendingCheckout(false);
		}, 30_000);

		return () => clearTimeout(timeout);
	}, [pendingCheckout]);

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
