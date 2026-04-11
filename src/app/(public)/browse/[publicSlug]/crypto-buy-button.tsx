'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2Icon, WalletIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection } from 'wagmi';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { useIsWeb3Ready } from '@/providers/web3-provider';
import { usePollMyTicketCodes } from '@/services/ticket/use-poll-my-ticket-codes';
import type { RaffleCryptoOptions } from '@/types/raffle';

// Lazy-load the crypto checkout modal — pulls in wagmi, viem, and web3 stack.
// Only loaded when user clicks "Pay with Crypto".
const CryptoCheckoutModal = dynamic(
	() =>
		import('@/components/payment/crypto-checkout-modal').then(m => ({
			default: m.CryptoCheckoutModal,
		})),
	{ ssr: false },
);

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
 * Secondary purchase button for crypto payments via Web3 wallet. Gates on
 * `useIsWeb3Ready` because `Web3Provider` defers mounting `WagmiProvider`
 * until a client-side dynamic import resolves (see web3-provider.tsx for
 * why). Calling wagmi hooks before that point throws
 * `WagmiProviderNotFoundError`, which was seen in production during SSR of
 * `POST /browse/[publicSlug]` server actions.
 *
 * The inner component is split out so React fully unmounts the placeholder
 * and mounts a fresh tree once wagmi becomes ready — this preserves Rules of
 * Hooks (the inner component's hook count is stable) and avoids the
 * conditional-hook trap.
 *
 * Flow (with atomic checkout):
 * 1. Click → opens RainbowKit wallet connect modal if not connected
 * 2. Once connected → opens crypto checkout modal with raffle params
 * 3. Modal handles chain/token/wallet selection, then calls atomic checkout
 *    endpoint which creates order + session in one call
 */
export function CryptoBuyButton(props: CryptoBuyButtonProps) {
	// `false` during SSR and the pre-hydration paint, flips to `true` once
	// Web3Provider's lazy wagmi config import resolves and `WagmiProvider`
	// mounts. Rendering the inner component before then throws.
	const isWeb3Ready = useIsWeb3Ready();

	if (!isWeb3Ready) {
		return <CryptoBuyButtonPlaceholder />;
	}

	return <CryptoBuyButtonInner {...props} />;
}

/**
 * Disabled placeholder that matches `CryptoBuyButtonInner`'s "Preparing
 * wallet..." state visually. Rendered while `WagmiProvider` is not yet in
 * the tree so we never call wagmi hooks outside their required context.
 *
 * @returns Disabled button with spinner and "Preparing wallet..." label
 */
function CryptoBuyButtonPlaceholder() {
	return (
		<Button
			disabled
			variant="outline"
			className="h-12 w-full cursor-not-allowed border-2 border-[#D4D4D4] bg-[#F5F5F5] text-[#7B7B7B] hover:bg-[#F5F5F5] hover:text-[#7B7B7B]"
		>
			<Loader2Icon className="mr-2 size-4 animate-spin" />
			<p className="font-semibold">Preparing wallet...</p>
		</Button>
	);
}

/**
 * Inner component — called only after `WagmiProvider` is mounted so every
 * wagmi hook invocation below is safe. Parent `CryptoBuyButton` handles the
 * ready gate.
 */
function CryptoBuyButtonInner({
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
	const { isConnected } = useConnection();

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
	const isCryptoModalOpen = showCryptoModal || (pendingCheckout && isConnected);

	const { isExpired: isTicketSyncExpired, isSynced: isTicketSyncComplete } =
		usePollMyTicketCodes(
			ticketSyncTarget !== null ? raffleId : null,
			ticketSyncTarget,
		);

	// ==========================================
	// Auto-proceed after wallet connection
	// ==========================================

	// useEffect: sync target = clear stale checkout intent after 30s timeout.
	// Deps: [pendingCheckout] — only re-arm when intent changes.
	// Cleanup: clears timeout if component unmounts or pendingCheckout toggles.
	// Why effect: external timer integration — no user event to hook into.
	useEffect(() => {
		if (!pendingCheckout) return;

		// 30s is tight enough to prevent ghost orders from stale intent,
		// but long enough for slow WalletConnect QR scans on mobile
		const timeout = setTimeout(() => {
			setPendingCheckout(false);
		}, 30_000);

		return () => clearTimeout(timeout);
	}, [pendingCheckout]);

	// useEffect: sync target = resolve ticket polling when hook reaches terminal state.
	// Deps: [isTicketSyncComplete, isTicketSyncExpired, router, ticketSyncTarget]
	// — re-evaluates whenever poll status or sync target changes.
	// Cleanup: none needed — queueMicrotask is fire-and-forget.
	// Why effect: bridges external polling hook state into component state + router.
	useEffect(() => {
		const didSyncSettle = isTicketSyncComplete || isTicketSyncExpired;

		if (ticketSyncTarget === null || !didSyncSettle) return;
		if (resolvedTicketSyncTarget.current === ticketSyncTarget) return;

		resolvedTicketSyncTarget.current = ticketSyncTarget;

		queueMicrotask(() => {
			setTicketSyncTarget(currentTarget =>
				currentTarget === ticketSyncTarget ? null : currentTarget,
			);
			router.refresh();
		});
	}, [isTicketSyncComplete, isTicketSyncExpired, router, ticketSyncTarget]);

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

		track(PURCHASE_EVENTS.TICKET_SELECTION_VIEWED, {
			raffle_id: raffleId,
			quantity: ticketQuantity,
			payment_method: 'crypto',
			has_promo: !!promoCode,
			is_wallet_connected: isConnected,
		});

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

	// useCallback: stable reference for handleConfirmingChange.
	// Avoids re-render cascade — this callback is in CryptoCheckoutModal's useEffect deps.
	// Without memoization, every parent render triggers a spurious child effect fire.
	const handleConfirmingChange = useCallback((confirming: boolean) => {
		setIsConfirming(confirming);
	}, []);

	// useCallback: stable reference for handleCryptoSuccess.
	// Deps: [myTicketsTotal, router] — re-creates when baseline ticket count or router changes.
	// Accepts confirmed quantity from modal (not parent prop) because ticketQuantity can drift
	// during the 30-120s confirming window if user changes the ticket selector.
	const handleCryptoSuccess = useCallback(
		(confirmedQuantity: number) => {
			resolvedTicketSyncTarget.current = null;
			router.refresh();
			setTicketSyncTarget(myTicketsTotal + confirmedQuantity);
		},
		[myTicketsTotal, router],
	);

	function handleCryptoModalOpenChange(open: boolean) {
		setShowCryptoModal(open);

		// Once the modal is dismissed we must clear the latent checkout intent,
		// otherwise reconnecting a wallet later would reopen checkout unexpectedly.
		if (!open) {
			setPendingCheckout(false);
		}
	}

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

			{questionId ? (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={raffleId}
					onCorrectAnswer={handleCorrectAnswer}
				/>
			) : null}

			<CryptoCheckoutModal
				open={isCryptoModalOpen}
				onOpenChange={handleCryptoModalOpenChange}
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
