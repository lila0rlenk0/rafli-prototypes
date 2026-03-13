'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2Icon, WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

import { CryptoCheckoutModal } from '@/components/payment/crypto-checkout-modal';
import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';
import { usePollMyTicketCodes } from '@/services/ticket/use-poll-my-ticket-codes';
import type { CryptoTokenPricing } from '@/types/raffle';

// ==========================================
// Types
// ==========================================

interface CryptoBuyButtonProps {
	raffleId: string;
	endAt: string;
	ticketQuantity: number;
	disabled?: boolean;
	questionId?: string | null;
	promoCode?: string;

	onPromoInvalid?: () => void;
	cryptoChainIds: number[];
	/** Allowed token slugs — empty means all tokens allowed */
	cryptoTokens?: string[];
	/** Non-stablecoin pricing per token — needed for EARNM and future non-stablecoin tokens */
	cryptoTokenPricing?: CryptoTokenPricing;
	/** Current server-rendered ticket total for this raffle — baseline for post-payment sync */
	myTicketsTotal: number;
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
	endAt,
	ticketQuantity,
	disabled = false,
	questionId,
	promoCode,
	onPromoInvalid,
	cryptoChainIds,
	cryptoTokens = [],
	cryptoTokenPricing = [],
	myTicketsTotal,
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
	// Tracks active confirming state — persists when modal is closed during confirmation
	// so we can show a "pending transaction" button to reopen the modal
	const [isConfirming, setIsConfirming] = useState(false);
	// Expected total after a successful crypto purchase.
	// We keep polling ticket codes until the server-rendered "My Tickets" source of
	// truth reaches this number, then trigger one final router.refresh().
	const [ticketSyncTarget, setTicketSyncTarget] = useState<number | null>(null);
	// Dev Strict Mode can re-run effects; resolve each target once to avoid duplicate
	// terminal refreshes when sync completes or times out.
	const resolvedTicketSyncTarget = useRef<number | null>(null);
	// Tracks whether the raffle question was already answered correctly this session.
	// Without this, every click re-gates on questionId — forcing the user to re-answer
	// if the crypto flow fails or wallet connect doesn't open.
	const [questionAnswered, setQuestionAnswered] = useState(false);
	// Synchronous single-flight guard for order creation.
	// `setIsLoading(true)` is async, so a rapid second click or the post-connect
	// auto-proceed effect can otherwise enter `buildCheckoutOrder()` before the
	// disabled state lands on screen.
	const checkoutLaunchInFlight = useRef(false);

	const { isExpired: isTicketSyncExpired, isSynced: isTicketSyncComplete } =
		usePollMyTicketCodes(
			ticketSyncTarget !== null ? raffleId : null,
			ticketSyncTarget,
		);

	// ==========================================
	// Checkout Flow
	// ==========================================

	/**
	 * Creates order and opens crypto checkout modal.
	 * Uses shared buildCheckoutOrder for order creation + promo handling,
	 * then opens modal for the resulting order.
	 */
	const proceedToCryptoCheckout = useCallback(async () => {
		// Guard at function entry so every caller path shares the same lock:
		// direct click, question modal success, and wallet-connect auto-proceed.
		if (checkoutLaunchInFlight.current) return;
		checkoutLaunchInFlight.current = true;
		// Once order creation starts, the pending connect intent has been consumed.
		// Clearing it here prevents the auto-proceed effect from replaying stale intent
		// if connection state changes while the async order build is in flight.
		setPendingCheckout(false);
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
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			checkoutLaunchInFlight.current = false;
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
		// Use the ref guard instead of `isLoading`: the effect can race before
		// React commits the disabled/loading state after a direct click.
		if (pendingCheckout && isConnected && !checkoutLaunchInFlight.current) {
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

	/**
	 * When ticket issuance catches up, refresh the route one more time so the
	 * server-rendered Raffle Details panel reflects the new ticket codes and total.
	 *
	 * Why a second refresh is needed:
	 * - The first refresh happens when payment is confirmed
	 * - Ticket issuance is async after order completion
	 * - Refreshing again only after `getMyTicketCodes()` reports the expected total
	 *   removes the need for a manual page reload
	 */
	useEffect(() => {
		if (ticketSyncTarget === null || !isTicketSyncComplete) return;
		if (resolvedTicketSyncTarget.current === ticketSyncTarget) return;
		resolvedTicketSyncTarget.current = ticketSyncTarget;
		setTicketSyncTarget(null);
		router.refresh();
	}, [ticketSyncTarget, isTicketSyncComplete, router]);

	/**
	 * Safety net: if ticket issuance never catches up within the polling window,
	 * stop the background loop and do one last refresh.
	 *
	 * This avoids an infinite poll while still giving the page one more chance to
	 * pick up late data before falling back to the existing manual-refresh behavior.
	 */
	useEffect(() => {
		if (ticketSyncTarget === null || !isTicketSyncExpired) return;
		if (resolvedTicketSyncTarget.current === ticketSyncTarget) return;
		resolvedTicketSyncTarget.current = ticketSyncTarget;
		setTicketSyncTarget(null);
		router.refresh();
	}, [ticketSyncTarget, isTicketSyncExpired, router]);

	// ==========================================
	// Handlers
	// ==========================================

	/**
	 * Main click handler
	 * - If confirming → reopen the modal (no new order needed)
	 * - If question required → show question modal first
	 * - If wallet not connected → open RainbowKit connect modal, then auto-proceed
	 * - If wallet connected → create order and open crypto checkout
	 */
	function handleClick() {
		// Reopen modal to show confirmation progress — no new order needed
		if (isConfirming && cryptoOrderId) {
			setShowCryptoModal(true);
			return;
		}

		// Gate on raffle question — skip if already answered this session
		if (questionId && !questionAnswered) {
			setShowQuestionModal(true);
			return;
		}
		startCryptoFlow();
	}

	/** Handles the raffle question modal success — marks answered and starts checkout. */
	function handleCorrectAnswer() {
		setQuestionAnswered(true);
		startCryptoFlow();
	}

	/**
	 * Starts the crypto payment flow
	 * Opens wallet connect if needed, otherwise proceeds directly
	 */
	function startCryptoFlow() {
		if (!isConnected) {
			// RainbowKit intentionally withholds modal open handlers until the wallet
			// modal is actually displayable. Do not set latent checkout intent when the
			// handler is unavailable, or an unrelated later wallet connect can create an order.
			if (!openConnectModal) {
				toast.error('Wallet connect is still loading. Please try again.');
				return;
			}
			setPendingCheckout(true);
			openConnectModal();
			return;
		}
		proceedToCryptoCheckout();
	}

	// ==========================================
	// Button Text
	// ==========================================

	/**
	 * Handles confirming state change from the crypto checkout modal.
	 * When modal transitions to/from confirming, we track it here so the
	 * button reflects the pending transaction even when modal is closed.
	 */
	const handleConfirmingChange = useCallback((confirming: boolean) => {
		setIsConfirming(confirming);
	}, []);

	/**
	 * Crypto success means the order completed, but ticket codes may still be
	 * issuing asynchronously. Refresh immediately for raffle counters, then keep a
	 * background sync alive until the bought tickets actually appear.
	 */
	const handleCryptoSuccess = useCallback(() => {
		resolvedTicketSyncTarget.current = null;
		router.refresh();
		setTicketSyncTarget(myTicketsTotal + ticketQuantity);
	}, [myTicketsTotal, router, ticketQuantity]);

	/**
	 * Gets button label based on wallet connection and transaction state
	 */
	function getButtonText(): string {
		if (isLoading) return 'Processing...';
		if (isConfirming) return 'Transaction pending...';
		if (!isConnected) return 'Connect wallet to buy';
		return 'Buy with crypto';
	}

	/**
	 * Gets button icon — pulsing loader for confirming, wallet otherwise
	 */
	function getButtonIcon(): React.ReactNode {
		if (isLoading || isConfirming) {
			return <Loader2Icon className="mr-2 size-4 animate-spin" />;
		}
		return <WalletIcon className="mr-2 size-4" />;
	}

	/**
	 * Button class — amber border when confirming to draw attention to pending tx
	 */
	function getButtonClass(): string {
		const base = 'h-12 w-full cursor-pointer border-2';
		if (isConfirming) {
			return `${base} border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100`;
		}
		return `${base} border-black bg-white text-black hover:bg-black hover:text-white`;
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<>
			<Button
				onClick={handleClick}
				disabled={isLoading || (disabled && !isConfirming)}
				variant="outline"
				className={getButtonClass()}
			>
				{getButtonIcon()}
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
					key={cryptoOrderId}
					open={showCryptoModal}
					onOpenChange={setShowCryptoModal}
					orderId={cryptoOrderId}
					raffleEndAt={endAt}
					cryptoChainIds={cryptoChainIds}
					cryptoTokens={cryptoTokens}
					cryptoTokenPricing={cryptoTokenPricing}
					userId={userId}
					onSuccess={handleCryptoSuccess}
					onConfirmingChange={handleConfirmingChange}
				/>
			)}
		</>
	);
}
