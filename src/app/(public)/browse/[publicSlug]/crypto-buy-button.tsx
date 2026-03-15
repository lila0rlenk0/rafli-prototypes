'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2Icon, WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

import { CryptoCheckoutModal } from '@/components/payment/crypto-checkout-modal';
import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import { usePollMyTicketCodes } from '@/services/ticket/use-poll-my-ticket-codes';
import type { RaffleCryptoOptions } from '@/types/raffle';

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
	/** Structured crypto options from raffle — chains with selectable tokens */
	cryptoOptions: RaffleCryptoOptions;
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
 * Flow (with atomic checkout):
 * 1. Click → opens RainbowKit wallet connect modal if not connected
 * 2. Once connected → opens crypto checkout modal with raffle params
 * 3. Modal handles chain/token/wallet selection, then calls atomic checkout
 *    endpoint which creates order + session in one call
 */
export function CryptoBuyButton({
	raffleId,
	endAt,
	ticketQuantity,
	disabled = false,
	questionId,
	promoCode,
	onPromoInvalid,
	cryptoOptions,
	myTicketsTotal,
	userId,
}: CryptoBuyButtonProps) {
	const router = useRouter();
	const { openConnectModal } = useConnectModal();
	const { isConnected } = useAccount();

	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [showCryptoModal, setShowCryptoModal] = useState(false);
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
	// RainbowKit intentionally withholds modal open handlers until the provider tree
	// is mounted and the connect modal can actually render. Track that separately so
	// this CTA never invites a click path that must no-op.
	const isConnectModalReady = !!openConnectModal;

	const { isExpired: isTicketSyncExpired, isSynced: isTicketSyncComplete } =
		usePollMyTicketCodes(
			ticketSyncTarget !== null ? raffleId : null,
			ticketSyncTarget,
		);

	// ==========================================
	// Auto-proceed after wallet connection
	// ==========================================

	/**
	 * When user connects wallet after clicking the button,
	 * automatically open crypto checkout modal.
	 * setState is intentional here — syncing external wallet-connect event to FE state.
	 */
	useEffect(() => {
		if (pendingCheckout && isConnected) {
			/* eslint-disable react-hooks/set-state-in-effect -- intentional: syncing external wallet-connect event to FE state */
			setPendingCheckout(false);
			setShowCryptoModal(true);
			/* eslint-enable react-hooks/set-state-in-effect */
		}
	}, [pendingCheckout, isConnected]);

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
	 * server-rendered Raffle Details panel reflects the new ticket codes.
	 *
	 * setState is intentional — syncing external polling result to FE state.
	 */
	useEffect(() => {
		if (ticketSyncTarget === null || !isTicketSyncComplete) return;
		if (resolvedTicketSyncTarget.current === ticketSyncTarget) return;
		resolvedTicketSyncTarget.current = ticketSyncTarget;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resolving ticket sync from polling callback
		setTicketSyncTarget(null);
		router.refresh();
	}, [ticketSyncTarget, isTicketSyncComplete, router]);

	/**
	 * Safety net: if ticket issuance never catches up within the polling window,
	 * stop the background loop and do one last refresh.
	 */
	useEffect(() => {
		if (ticketSyncTarget === null || !isTicketSyncExpired) return;
		if (resolvedTicketSyncTarget.current === ticketSyncTarget) return;
		resolvedTicketSyncTarget.current = ticketSyncTarget;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resolving ticket sync timeout
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
	 * - If wallet connected → open crypto checkout modal
	 */
	function handleClick() {
		// Reopen modal to show confirmation progress — no new order needed
		if (isConfirming) {
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
	 * Opens wallet connect if needed, otherwise opens modal directly
	 */
	function startCryptoFlow() {
		if (!isConnected) {
			// RainbowKit intentionally withholds modal open handlers until the wallet
			// modal is actually displayable. Do not set latent checkout intent when the
			// handler is unavailable, or an unrelated later wallet connect can create an order.
			if (!openConnectModal) {
				return;
			}
			setPendingCheckout(true);
			openConnectModal();
			return;
		}
		setShowCryptoModal(true);
	}

	// ==========================================
	// Callbacks
	// ==========================================

	/**
	 * Handles confirming state change from the crypto checkout modal.
	 * When modal transitions to/from confirming, we track it here so the
	 * button reflects the pending transaction even when modal is closed.
	 *
	 * useCallback required — passed as prop to modal where it sits in a useEffect
	 * dependency array. Without stable reference, every parent render triggers
	 * a spurious effect fire in the child.
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

	// ==========================================
	// Button Text
	// ==========================================

	/**
	 * Gets button label based on wallet connection and transaction state
	 */
	function getButtonText(): string {
		if (isConfirming) return 'Transaction pending...';
		if (!isConnected && !isConnectModalReady) return 'Preparing wallet...';
		if (!isConnected) return 'Connect wallet to buy';
		return 'Buy with crypto';
	}

	/**
	 * Gets button icon — pulsing loader for confirming, wallet otherwise
	 */
	function getButtonIcon(): React.ReactNode {
		if (isConfirming || (!isConnected && !isConnectModalReady)) {
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
		if (!isConnected && !isConnectModalReady) {
			return `${base} cursor-not-allowed border-[#D4D4D4] bg-[#F5F5F5] text-[#7B7B7B] hover:bg-[#F5F5F5] hover:text-[#7B7B7B]`;
		}
		return `${base} border-black bg-white text-black hover:bg-black hover:text-white`;
	}

	/**
	 * Disable the CTA while RainbowKit is not ready to open.
	 *
	 * Without this, the first tap during slow hydration silently returns from
	 * startCryptoFlow and loses the user's intent to connect and continue checkout.
	 */
	function isButtonDisabled(): boolean {
		if (isConfirming) return false;
		return disabled || (!isConnected && !isConnectModalReady);
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<>
			<Button
				onClick={handleClick}
				disabled={isButtonDisabled()}
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

			<CryptoCheckoutModal
				open={showCryptoModal}
				onOpenChange={setShowCryptoModal}
				raffleId={raffleId}
				ticketQuantity={ticketQuantity}
				promoCode={promoCode}
				onPromoInvalid={onPromoInvalid}
				raffleEndAt={endAt}
				cryptoOptions={cryptoOptions}
				userId={userId}
				onSuccess={handleCryptoSuccess}
				onConfirmingChange={handleConfirmingChange}
			/>
		</>
	);
}
