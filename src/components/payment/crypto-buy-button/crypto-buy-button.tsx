'use client';

import {
	useAppKit,
	useAppKitAccount,
	useAppKitState,
} from '@reown/appkit/react';
import dynamic from 'next/dynamic';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';

import { CryptoBuyButtonVisual } from './visual';
import { useCryptoPurchaseSync } from './use-purchase-sync';
import { RaffleQuestionModal } from '@/components/raffle/question-modal/question-modal';
import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { getCryptoBuyButtonUiState } from './state';

// Lazy-load the crypto checkout modal — pulls in wagmi, viem, and the
// rest of the web3 stack. Only loaded when the user clicks "Pay with Crypto".
const CryptoCheckoutModal = dynamic(
	() =>
		import('@/components/payment/crypto-checkout/crypto-checkout-modal').then(
			m => ({
				default: m.CryptoCheckoutModal,
			}),
		),
	{ ssr: false },
);

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

/**
 * CryptoBuyButton — secondary CTA for crypto payments.
 *
 * Flow:
 * 1. Click → if no wallet connected, opens Reown AppKit modal directly
 * 2. After wallet connects (or if already connected) → opens checkout modal
 * 3. Modal handles chain/token selection, then calls the atomic checkout
 *
 * Post-success ticket polling lives in `useCryptoPurchaseSync`; button
 * visuals live in `CryptoBuyButtonVisual`. This shell only orchestrates.
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
	const { open: openAppKit } = useAppKit();
	const { isConnected: appKitIsConnected, status: walletStatus } =
		useAppKitAccount();
	// AppKit is ready once its controllers have initialized — before that,
	// opening the modal would show a blank state.
	const { initialized: isAppKitReady } = useAppKitState();

	// Reown AppKit hooks read from a client-only store. On SSR they return
	// defaults that diverge from post-hydrate client state, causing a
	// hydration mismatch on the button's icon and disabled attribute.
	//
	// `useSyncExternalStore` with constant snapshots is the idiomatic
	// "am I hydrated?" primitive: SSR + hydration render match `false`,
	// then React switches to the client snapshot `true` after hydration
	// commits. Gating AppKit reads behind this flag avoids the
	// setState-in-effect cascade pattern.
	const hasMounted = useSyncExternalStore(
		subscribeNoop,
		getHasMountedClient,
		getHasMountedServer,
	);

	const isConnected = hasMounted && appKitIsConnected;
	const canConnect = hasMounted && isAppKitReady;
	const isConnecting = hasMounted && walletStatus === 'connecting';

	// Access Pass acknowledgment — the state machine maps this into a
	// distinct 'needs-acknowledgment' variant so the user sees an
	// actionable label ("Acknowledge terms to continue") instead of a
	// silent disabled button. Shared across desktop card + mobile sticky
	// CTA via the store.
	const isAccessPassAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);

	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [showCryptoModal, setShowCryptoModal] = useState(false);
	// Tracks active confirming state — persists when the modal is closed
	// during confirmation so we can show a "pending transaction" button
	// to reopen the modal.
	const [isConfirming, setIsConfirming] = useState(false);
	// Tracks whether the raffle question was already answered correctly
	// this session. Without this, every click re-gates on `questionId` —
	// forcing the user to re-answer if the crypto flow fails or wallet
	// connect doesn't open.
	const [questionAnswered, setQuestionAnswered] = useState(false);
	// Set when we opened AppKit for wallet connection — cleared once the
	// checkout modal opens. Lets us auto-advance to checkout after the
	// user picks a wallet in AppKit's modal.
	const pendingConnectRef = useRef(false);

	const { handleCryptoSuccess } = useCryptoPurchaseSync({
		raffleId,
		myTicketsTotal,
	});

	// useEffect: auto-advance to checkout modal after AppKit wallet
	// connection. Deps: [isConnected] — fires when the wallet connects
	// after the user picks one in AppKit's modal. Only acts when
	// pendingConnectRef is set (i.e., we initiated the AppKit flow).
	// Why effect: bridges external AppKit connection state into component
	// state — DOM-external sync, not derivable from props.
	useEffect(() => {
		if (isConnected && pendingConnectRef.current) {
			pendingConnectRef.current = false;
			// Deferred to avoid synchronous setState in the effect body —
			// opens the checkout modal on the next microtask after AppKit
			// confirms connection.
			queueMicrotask(() => {
				setShowCryptoModal(true);
			});
		}
	}, [isConnected]);

	/**
	 * Starts the crypto payment flow. If no wallet is connected, opens
	 * Reown's AppKit modal directly for wallet selection. Once connected,
	 * opens the checkout modal.
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

	function handleClick() {
		// Reopen the modal to show confirmation progress — no new order needed.
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

		// Gate on the raffle question — skip if already answered this session.
		if (questionId && !questionAnswered) {
			setShowQuestionModal(true);
			return;
		}
		startCryptoFlow();
	}

	function handleCorrectAnswer() {
		setQuestionAnswered(true);
		startCryptoFlow();
	}

	// useCallback: stable reference passed into `CryptoCheckoutModal`'s
	// effect deps. Without memoization, every parent render would trigger
	// a spurious child effect fire.
	const handleConfirmingChange = useCallback((confirming: boolean) => {
		setIsConfirming(confirming);
	}, []);

	const handleCryptoModalOpenChange = (open: boolean) => {
		setShowCryptoModal(open);
	};

	const buttonState = getCryptoBuyButtonUiState({
		isConfirming,
		isConnected,
		canOpenConnectModal: canConnect,
		disabled,
		isAccessPassAcknowledged,
	});

	return (
		<>
			<CryptoBuyButtonVisual
				state={buttonState}
				isConnecting={isConnecting}
				onClick={handleClick}
				chains={cryptoOptions.chains}
			/>

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
