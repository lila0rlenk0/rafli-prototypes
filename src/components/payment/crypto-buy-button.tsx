'use client';

import {
	useAppKit,
	useAppKitAccount,
	useAppKitState,
} from '@reown/appkit/react';
import { Loader2Icon, WalletIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { usePollMyTicketCodes } from '@/services/ticket/use-poll-my-ticket-codes';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { getCryptoBuyButtonUiState } from './crypto-buy-button-state';

// Lazy-load the crypto checkout modal — pulls in wagmi, viem, and the
// rest of the web3 stack. Only loaded when the user clicks "Pay with Crypto".
const CryptoCheckoutModal = dynamic(
	() =>
		import('@/components/payment/crypto-checkout-modal').then(m => ({
			default: m.CryptoCheckoutModal,
		})),
	{ ssr: false },
);

// ==========================================
// Hydration helpers
// ==========================================

// Module-scope constants — stable references for `useSyncExternalStore`.
// Reference equality matters: inline arrow functions would tear down the
// subscription on every render and defeat React's snapshot cache.
function subscribeNoop(): () => void {
	return function unsubscribe() {};
}
function getHasMountedClient(): boolean {
	return true;
}
function getHasMountedServer(): boolean {
	return false;
}

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
	/** Current server-rendered ticket total — baseline for post-payment sync */
	myTicketsTotal: number;
	userId?: string | null;
}

// ==========================================
// Component
// ==========================================

/**
 * CryptoBuyButton — secondary CTA for crypto payments.
 *
 * Flow:
 * 1. Click → if no wallet connected, opens Reown AppKit modal directly
 * 2. After wallet connects (or if already connected) → opens checkout modal
 * 3. Modal handles chain/token selection, then calls atomic checkout endpoint
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
	const { open: openAppKit } = useAppKit();
	const { isConnected: appKitIsConnected, status: walletStatus } =
		useAppKitAccount();
	// AppKit is ready once its controllers have initialized — before that,
	// opening the modal would show a blank state.
	const { initialized: isAppKitReady } = useAppKitState();

	// Reown AppKit hooks read from a client-only store. On SSR they return
	// defaults that diverge from post-hydrate client state, causing a hydration
	// mismatch on the button's icon and disabled attribute.
	//
	// `useSyncExternalStore` with constant snapshots is the idiomatic React 18
	// "am I hydrated?" primitive: SSR + hydration render match `false`, then
	// React switches to the client snapshot `true` after hydration commits.
	// Gating AppKit reads behind this flag guarantees no hydration divergence
	// and avoids the setState-in-effect cascade pattern.
	const hasMounted = useSyncExternalStore(
		subscribeNoop,
		getHasMountedClient,
		getHasMountedServer,
	);

	const isConnected = hasMounted && appKitIsConnected;
	const canConnect = hasMounted && isAppKitReady;
	const isConnecting = hasMounted && walletStatus === 'connecting';

	// Access Pass acknowledgment — the state machine maps this into a
	// distinct 'needs-acknowledgment' variant so the user sees an actionable
	// label ("Acknowledge terms to continue") instead of a silent disabled
	// button. Shared across desktop card + mobile sticky CTA via the store.
	const isAccessPassAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);

	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [showCryptoModal, setShowCryptoModal] = useState(false);
	// Tracks active confirming state — persists when modal is closed during
	// confirmation so we can show a "pending transaction" button to reopen the modal.
	const [isConfirming, setIsConfirming] = useState(false);
	// Expected ticket total after a successful crypto purchase. We keep polling
	// ticket codes until the server-rendered "My Tickets" source of truth reaches
	// this number, then trigger one final `router.refresh()`.
	const [ticketSyncTarget, setTicketSyncTarget] = useState<number | null>(null);
	// Dev Strict Mode can re-run effects; resolve each target once to avoid
	// duplicate terminal refreshes when sync completes or times out.
	const resolvedTicketSyncTarget = useRef<number | null>(null);
	// Tracks whether the raffle question was already answered correctly this
	// session. Without this, every click re-gates on `questionId` — forcing the
	// user to re-answer if the crypto flow fails or wallet connect doesn't open.
	const [questionAnswered, setQuestionAnswered] = useState(false);
	// Set when we opened AppKit for wallet connection — cleared once the
	// checkout modal opens. Lets us auto-advance to checkout after the user
	// picks a wallet in AppKit's modal.
	const pendingConnectRef = useRef(false);

	const { isExpired: isTicketSyncExpired, isSynced: isTicketSyncComplete } =
		usePollMyTicketCodes(
			ticketSyncTarget !== null ? raffleId : null,
			ticketSyncTarget,
		);

	// useEffect: auto-advance to checkout modal after AppKit wallet connection.
	// Deps: [isConnected] — fires when wallet connects after user picked one
	// in AppKit's modal. Only acts when pendingConnectRef is set (i.e., we
	// initiated the AppKit flow). Cleanup: none needed.
	// Why effect: bridges external AppKit connection state into component state.
	useEffect(() => {
		if (isConnected && pendingConnectRef.current) {
			pendingConnectRef.current = false;
			// Deferred to avoid synchronous setState in effect body — opens
			// checkout modal on the next microtask after AppKit confirms connection.
			queueMicrotask(() => {
				setShowCryptoModal(true);
			});
		}
	}, [isConnected]);

	// useEffect: sync target = resolve ticket polling when hook reaches
	// terminal state.
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
	 * - Otherwise → open crypto checkout modal (wallet step handles connection)
	 */
	function handleClick() {
		// Reopen modal to show confirmation progress — no new order needed.
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

		// Gate on raffle question — skip if already answered this session.
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
	 * Starts the crypto payment flow.
	 *
	 * If no wallet is connected, opens Reown's AppKit modal directly for
	 * wallet selection. Once connected, opens the checkout modal.
	 */
	function startCryptoFlow() {
		if (!canConnect) return;

		if (!isConnected) {
			pendingConnectRef.current = true;
			void openAppKit({ view: 'Connect' });
			return;
		}

		setShowCryptoModal(true);
	}

	// ==========================================
	// Callbacks
	// ==========================================

	// useCallback: stable reference for handleConfirmingChange.
	// Avoids re-render cascade — this callback is in CryptoCheckoutModal's
	// useEffect deps. Without memoization, every parent render triggers a
	// spurious child effect fire.
	const handleConfirmingChange = useCallback((confirming: boolean) => {
		setIsConfirming(confirming);
	}, []);

	// useCallback: stable reference for handleCryptoSuccess.
	// Deps: [myTicketsTotal, router] — re-creates when baseline ticket count
	// or router changes. Accepts confirmed quantity from the modal (not parent
	// prop) because `ticketQuantity` can drift during the 30–120s confirming
	// window if the user changes the ticket selector.
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
	}

	// ==========================================
	// Button Text
	// ==========================================

	/**
	 * Gets button icon — pulsing loader for confirming, wallet otherwise.
	 */
	function getButtonIcon(showLoadingIcon: boolean): ReactNode {
		if (showLoadingIcon) {
			return <Loader2Icon className="mr-2 size-4 animate-spin" />;
		}
		return <WalletIcon className="mr-2 size-4" />;
	}

	/**
	 * Button class — amber border when confirming to draw attention to
	 * pending tx; greyed out for both `preparing` (wallet SDK loading) and
	 * `needs-acknowledgment` (user hasn't ticked the consent box yet)
	 * because both represent "not actionable yet" states that deserve the
	 * same muted treatment.
	 */
	function getButtonClass(
		variant: ReturnType<typeof getCryptoBuyButtonUiState>['variant'],
	): string {
		const base = 'h-12 w-full cursor-pointer border-2';
		if (variant === 'confirming') {
			return `${base} border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100`;
		}
		if (variant === 'preparing' || variant === 'needs-acknowledgment') {
			return `${base} cursor-not-allowed border-[#D4D4D4] bg-[#F5F5F5] text-[#7B7B7B] hover:bg-[#F5F5F5] hover:text-[#7B7B7B]`;
		}
		return `${base} border-black bg-white text-black hover:bg-black hover:text-white`;
	}

	/**
	 * Disable the CTA while no wallet connector is ready.
	 *
	 * Without this, the first tap during slow hydration silently returns from
	 * `startCryptoFlow` and the user sees nothing happen.
	 */
	function renderButton() {
		const buttonState = getCryptoBuyButtonUiState({
			isConfirming,
			isConnected,
			canOpenConnectModal: canConnect,
			disabled,
			isAccessPassAcknowledged,
		});

		return (
			<Button
				onClick={handleClick}
				disabled={buttonState.isDisabled || isConnecting}
				variant="outline"
				className={getButtonClass(buttonState.variant)}
			>
				{getButtonIcon(buttonState.showLoadingIcon)}
				<p className="font-semibold">{buttonState.label}</p>
			</Button>
		);
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<>
			{renderButton()}

			{questionId ? (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={raffleId}
					onCorrectAnswer={handleCorrectAnswer}
				/>
			) : null}

			<CryptoCheckoutModal
				open={showCryptoModal}
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
