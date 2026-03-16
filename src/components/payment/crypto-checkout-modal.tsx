'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi, getAddress, zeroAddress, type Address } from 'viem';
import {
	useAccount,
	useBalance,
	useReadContract,
	useSignMessage,
	useSwitchChain,
	useTransaction,
	useTransactionConfirmations,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';

import { ChainSelector } from '@/components/payment/crypto-checkout/chain-selector';
import {
	getHydratedCheckoutStep,
	getPolledTxHashSyncDecision,
	getPaySessionRevalidationDecision,
	getReviewSessionGuard,
} from '@/components/payment/crypto-checkout/checkout-session-guards';
import { ConfirmingStep } from '@/components/payment/crypto-checkout/confirming-step';
import { ReviewStep } from '@/components/payment/crypto-checkout/review-step';
import {
	FailureStep,
	SuccessStep,
} from '@/components/payment/crypto-checkout/terminal-steps';
import { TokenSelector } from '@/components/payment/crypto-checkout/token-selector';
import { WalletStep } from '@/components/payment/crypto-checkout/wallet-step';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	getPaymentErrorMessage,
	getWalletErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import {
	CRYPTO_TX_SUBMIT_OUTCOME,
	getObservedConfirmationCount,
	getCryptoSessionGraceWindowMs,
	getCryptoTxSubmitOutcome,
	normalizeTxHash,
} from '@/lib/web3/crypto-payment-flow';
import { SUPPORTED_WEB3_CHAIN_IDS } from '@/lib/web3/config';
import { getSelectableCryptoChains } from '@/lib/web3/raffle-crypto-options';
import { isValidTxHash } from '@/lib/web3/block-explorers';
import { isTransactionNotFound, isUserRejection } from '@/lib/web3/errors';
import { abandonOrder } from '@/services/payment/abandon-order';
import { confirmCryptoTx } from '@/services/payment/confirm-crypto-tx';
import { createAtomicCryptoCheckout } from '@/services/payment/create-atomic-crypto-checkout';
import { getCryptoSession } from '@/services/payment/get-crypto-session';
import { submitCryptoTx } from '@/services/payment/submit-crypto-tx';
import { useCryptoConfig } from '@/services/payment/use-crypto-config';
import { usePollCheckoutStatus } from '@/services/payment/use-poll-checkout-status';
import { useWallets } from '@/services/wallet/use-wallets';
import { verifyWallet } from '@/services/wallet/verify-wallet';
import { CHECKOUT_PHASE } from '@/types/checkout-status';
import { PAYMENT_ERROR_CODES } from '@/types/errors';
import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';
import type { RaffleCryptoOptions, RaffleCryptoToken } from '@/types/raffle';
import type { CryptoCheckoutSession } from '@/types/wallet';

// ==========================================
// Constants
// ==========================================

/** Total steps when token selection is shown (multi-token chain) */
const TOTAL_STEPS_WITH_TOKEN = 4;

/** Total steps when token selection is auto-skipped (single-token chain) */
const TOTAL_STEPS_WITHOUT_TOKEN = 3;

/** Default failure message when backend provides no actionable reason */
const FALLBACK_FAILURE_MESSAGE =
	'Payment verification failed. Please try again.';

// ==========================================
// Types
// ==========================================

interface CryptoCheckoutModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Raffle ID — atomic checkout creates order + session from this */
	raffleId: string;
	/** Number of tickets to purchase */
	ticketQuantity: number;
	/** Optional promo code — applied atomically during checkout */
	promoCode?: string;
	/** Called when promo code is invalid and should be cleared from UI */
	onPromoInvalid?: () => void;
	raffleEndAt: string;
	/** Structured crypto options from raffle — chains with selectable tokens */
	cryptoOptions: RaffleCryptoOptions;
	userId?: string | null;
	/** Called on successful payment — passes the session's ticket quantity for sync targeting */
	onSuccess?: (confirmedQuantity: number) => void;
	/** Notifies parent when confirming state changes — used to show persistent "pending" button */
	onConfirmingChange?: (isConfirming: boolean) => void;
}

/**
 * Modal flow steps for crypto checkout.
 * select-token is auto-skipped when chain has only one token.
 */
type CheckoutStep =
	| 'select-chain'
	| 'select-token'
	| 'connect-wallet'
	| 'review'
	| 'confirming'
	| 'success'
	| 'failure';

type ReplacementReason = 'cancelled' | 'replaced' | 'repriced';
type SubmitRecoveryMode = null | 'poll' | 'retry';

/** Minimal server session shape needed by the hydration helper */
interface ServerSessionSnapshot {
	currency: string;
	txHash: string | null;
	failureReason?: string | null;
	/** Backend-provided submit deadline */
	submitDeadline: string;
	/** Backend-provided confirming deadline */
	confirmDeadline: string;
}

/** Runtime state snapshot applied when hydrating checkout from backend or local state changes */
interface CheckoutRuntimeState {
	txHash: `0x${string}` | undefined;
	txSubmitted: boolean;
	submitRecoveryMode?: SubmitRecoveryMode;
	finalizationRequested?: boolean;
	backendTrackedHash?: string | null;
	backendOwnsTx?: boolean;
	fundsAtRisk?: boolean;
	retryBlocked?: boolean;
	errorMessage?: string | null;
}

/** Params for the shared server→local hydration mapper */
interface ApplyServerHydrationParams {
	serverSession: ServerSessionSnapshot;
	checkoutSession: CryptoCheckoutSession;
	checksummedAddress: Address;
	fallbackToken: RaffleCryptoToken;
	nextStep: CheckoutStep;
}

// ==========================================
// Component
// ==========================================

/**
 * CryptoCheckoutModal Component
 *
 * Multi-step modal handling the full crypto payment flow:
 * 1. Select Chain — user picks target chain from raffle's supported chains
 * 2. Select Token — user picks token (auto-skipped if chain has single token)
 * 3. Connect & Verify Wallet — RainbowKit connect + EIP-191 signature verification
 * 4. Review & Send — atomic checkout (order + session), execute ERC20 transfer, submit tx hash
 * 5. Confirming — poll unified checkout status until backend confirms
 * 6. Success/Failure — terminal state with tx explorer link
 *
 * Backend handles cross-method guards automatically — atomic checkout cancels any
 * incompatible session (Stripe or stale crypto) before creating the new one.
 */
export function CryptoCheckoutModal({
	open,
	onOpenChange,
	raffleId,
	ticketQuantity,
	promoCode,
	onPromoInvalid,
	raffleEndAt,
	cryptoOptions,
	userId,
	onSuccess,
	onConfirmingChange,
}: CryptoCheckoutModalProps) {
	const [step, setStep] = useState<CheckoutStep>('select-chain');
	const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
	const [selectedToken, setSelectedToken] = useState<RaffleCryptoToken | null>(
		null,
	);
	const [session, setSession] = useState<CryptoCheckoutSession | null>(null);
	// Tracks which tokenId was used to create the current session — needed
	// to detect token changes when user navigates back and picks a different token.
	const [sessionTokenId, setSessionTokenId] = useState<string | null>(null);
	// Backend binds each session to the verified sender wallet (`fromAddress`).
	// Track the address used at session creation time so back-navigation cannot
	// silently reuse wallet A's session after the user reconnects wallet B.
	const [sessionWalletAddress, setSessionWalletAddress] =
		useState<Address | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// Tracks whether a reorg with ambiguous balance was detected — funds may have
	// left the wallet but the tx vanished. When true, "Try Again" is hidden to
	// prevent duplicate payments. Passed as explicit prop to FailureStep.
	const [fundsAtRisk, setFundsAtRisk] = useState(false);

	// Crypto config — chain metadata (names, explorers, confirmation targets)
	const { data: cryptoConfig } = useCryptoConfig();
	const chains = cryptoConfig?.chains ?? [];

	// Wagmi hooks
	const { address, chainId: connectedChainId } = useAccount();
	// Canonical connected wallet address used across verification and session guards.
	// wagmi can expose lowercase addresses depending on connector state; normalizing
	// once here keeps wallet-binding checks and server payloads consistent.
	const checksummedAddress = useMemo(
		() => (address ? getAddress(address) : null),
		[address],
	);
	// Live address ref for async guards that outlive a single render.
	// `checksummedAddress` (useMemo) captures render-time state; any `await` in
	// handlePay can resume with a stale closure if the user switches wallets mid-flight.
	// This ref is always current — read it after any async gap to detect wallet drift.
	const liveAddressRef = useRef(checksummedAddress);
	liveAddressRef.current = checksummedAddress;
	// Same pattern for chain ID — switchChainAsync can resolve on some connectors
	// without actually switching (e.g. user dismisses prompt). Reading the live ref
	// after await catches this edge case before writeContractAsync fires on the wrong chain.
	const liveChainIdRef = useRef(connectedChainId);
	liveChainIdRef.current = connectedChainId;
	const { signMessageAsync } = useSignMessage();
	const { switchChainAsync } = useSwitchChain();
	const { writeContractAsync, reset: resetWriteContract } = useWriteContract();
	// Canonical tx hash the FE should follow right now.
	// Stored locally instead of reading from useWriteContract's data so we can pivot
	// to replacement hashes when the wallet speeds up or replaces a transaction.
	const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

	// Guards against double-payment — set true immediately after writeContractAsync resolves,
	// before React re-renders. Cleared only in handleReset.
	const [txSubmitted, setTxSubmitted] = useState(false);
	// Distinguishes "retry same-hash once" from "poll only".
	// This avoids unnecessary duplicate submits once backend already owns the session state.
	const [submitRecoveryMode, setSubmitRecoveryMode] =
		useState<SubmitRecoveryMode>(null);
	// Some failures should not offer an immediate retry even if funds are not definitely
	// deducted yet (e.g. wallet cancelled/replaced after backend already bound a hash).
	const [retryBlocked, setRetryBlocked] = useState(false);

	// Synchronous ref guard for handlePay — prevents double-execution from rapid clicks.
	// React state (txSubmitted) is batched/async, so two clicks before re-render would
	// both pass the state check. This ref is set synchronously at function entry.
	const payInFlight = useRef(false);

	// Same pattern for handleWalletReady — prevents duplicate verify+checkout calls
	// when user rapid-clicks "Continue" on the wallet step.
	const walletReadyInFlight = useRef(false);
	// Guards the verify -> cancel -> checkout -> hydrate bootstrap path.
	// Closing the modal or starting a newer attempt invalidates older async completions
	// so they cannot repopulate state into a hidden or freshly-reopened modal.
	const preConfirmingFlowVersion = useRef(0);
	// Close/reset is delayed to match the Dialog exit animation.
	// Keep the timer handle so reopen can cancel the stale reset before it wipes new state.
	const closeResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Timer handle for confirm retry delay (5s after transient failure).
	// Stored in a ref so handleReset/handleClose can cancel it to prevent leaked state updates.
	const confirmRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	// Ref-based idempotency guard for submitCryptoTx effect.
	// Unlike txSubmitted (state), this is synchronous — prevents duplicate backend
	// submissions even when React batches state updates or re-runs effects (Strict Mode).
	const txSubmittedToBackend = useRef(false);
	// Tracks the exact hash the backend has accepted/polled for this session.
	// Needed because backend PR 40 binds `confirming` sessions to a single hash.
	const backendTrackedTxHash = useRef<string | null>(null);
	// Prevent overlapping submit calls between the initial submit and the one-shot
	// recovery retry. Without this, transport flakiness can stack duplicate POSTs.
	const submitRequestInFlight = useRef(false);
	// Exactly one same-hash retry per canonical tx hash.
	// Keeps recovery bounded even if the network stays flaky.
	const submitRetriedHashes = useRef<Set<string>>(new Set());
	// Replacement reason is only observable in the wallet/RPC layer.
	// Stash it so a later backend-hash mismatch can explain whether the tx was
	// sped up/replaced or explicitly cancelled.
	const lastReplacementReason = useRef<null | ReplacementReason>(null);

	// Idempotency guard for confirmCryptoTx — the FE-driven finalization call.
	// Fires once when on-chain confirmations reach the chain's target threshold.
	// Separate from txSubmittedToBackend because submit (hash notification) and
	// confirm (finalization request) are two distinct backend calls.
	const txConfirmRequested = useRef(false);
	// Distinct from txConfirmRequested: this only guards the active network call.
	// We keep failures retryable on the next polling tick instead of permanently
	// disabling FE-driven confirm after one transient error.
	const txConfirmInFlight = useRef(false);
	// UI-facing mirror of txConfirmRequested.
	// The ref is for idempotency; this state is for rendering the tracker row transition
	// from "Verifying payment" → "Completing order" after backend accepts confirm.
	const [finalizationRequested, setFinalizationRequested] = useState(false);
	// Bumped on confirmCryptoTx transient failure to re-trigger the FE-driven
	// finalization effect even when observedConfirmationCount doesn't change.
	// Without this, a failed confirm on an L2 chain (confirmationTarget=1) would
	// permanently stall — the effect deps plateau and never re-fire, leaving the
	// user waiting for the 1-min cron fallback instead of retrying within seconds.
	const [confirmRetryTick, setConfirmRetryTick] = useState(0);
	// Guards the success transition — prevents double onSuccess() when both
	// FE-driven confirm and polling detect COMPLETED in the same render cycle.
	// Set synchronously before async state update to close the race window.
	const successTransitioned = useRef(false);
	// Captures the ticket quantity at checkout creation time so transitionToSuccess
	// reports the actual purchased quantity, not the parent's live slider value
	// which can drift during the 30-120s confirming window.
	const confirmedTicketQuantity = useRef(ticketQuantity);

	// Guards reorg detection — prevents concurrent handlePossibleReorg executions
	// when txFailureCount increments multiple times while balance refetch is pending.
	const reorgHandled = useRef(false);

	/**
	 * Terminal failure when the wallet tx is already on-chain but FE can no longer
	 * trust the server-side session registration.
	 *
	 * Why this is a hard stop:
	 * - a transfer/broadcast already happened
	 * - backend PR 40 only finalizes against the stored session hash
	 * - blindly offering retry would risk duplicate payments or misleading UX
	 */
	const failSubmittedTxRegistration = useCallback(() => {
		setSubmitRecoveryMode(null);
		setRetryBlocked(true);
		setFundsAtRisk(true);
		setErrorMessage(
			'Transaction was sent, but the server could not safely register it. Please contact support with your transaction hash.',
		);
		setStep('failure');
	}, []);

	/**
	 * Handles the backend-immutable-hash edge case.
	 *
	 * Backend PR 40 treats the first accepted tx hash as the session's source of truth.
	 * If the wallet later replaces or cancels that tx with a different hash, the FE can
	 * detect it, but cannot mutate the backend session to follow the new hash.
	 */
	const failBackendTrackedReplacement = useCallback(
		(reason: null | ReplacementReason) => {
			setSubmitRecoveryMode(null);
			setRetryBlocked(true);

			if (reason === 'cancelled') {
				setFundsAtRisk(false);
				setErrorMessage(
					'Your wallet cancelled the original transaction after the server had already registered it. Please wait for the checkout session to clear, then try again.',
				);
			} else {
				setFundsAtRisk(true);
				setErrorMessage(
					'Your wallet replaced the original transaction after the server had already registered it. Please contact support with your transaction hash.',
				);
			}

			setStep('failure');
		},
		[],
	);

	/**
	 * Shared failure path once the backend grace window is genuinely exhausted.
	 *
	 * We deliberately distinguish "never safely registered a tx" from
	 * "backend knew about an in-flight payment" because the second case should not
	 * tell the user to simply retry — funds may already be committed on-chain.
	 */
	const failConfirmingWindowExpired = useCallback(() => {
		if (successTransitioned.current) return;

		// After tx submission, the payment may still be processing on-chain.
		// Before submission, this is just a session expiry.
		if (txSubmittedToBackend.current || !!txHash) {
			setErrorMessage(
				'Payment verification timed out. Your transaction may still be processing — please check your order history or contact support.',
			);
		} else {
			setErrorMessage('Checkout session expired. Please try again.');
		}

		setStep('failure');
	}, [txHash]);

	/**
	 * Minimal fallback token when backend returns a stored session for a token the
	 * current FE selection no longer represents.
	 *
	 * Why this fallback exists:
	 * - backend checkout recovery is authoritative and may return stored session values
	 * - the modal still needs a stable symbol/tokenId even if FE's latest selection differs
	 * - RaffleCryptoToken only drives display + local comparisons; on-chain execution uses the
	 *   session's tokenAddress/amount from backend, not this fallback object
	 */
	const buildRecoveredToken = useCallback(
		(
			currency: string,
			chainId: number,
			fallbackToken: RaffleCryptoToken,
		): RaffleCryptoToken => {
			const recoveredSlug = currency.toLowerCase();

			// Try to find the token in raffle's crypto options for this chain
			const chainTokens =
				cryptoOptions.chains.find(c => c.chainId === chainId)?.tokens ?? [];
			const matchedToken = chainTokens.find(t => t.tokenId === recoveredSlug);
			if (matchedToken) return matchedToken;

			// Fallback to the caller-provided token if tokenId matches
			if (fallbackToken.tokenId === recoveredSlug) return fallbackToken;

			// Last resort — synthesize a token from the currency string.
			// Only reached when backend stores a token not in the raffle's current options.
			const isStablecoin = recoveredSlug === 'usdc' || recoveredSlug === 'usdt';
			return {
				tokenId: recoveredSlug,
				symbol: currency,
				price: isStablecoin ? null : '0',
				// Placeholder values — on-chain execution uses session's tokenAddress/amount,
				// not these fields. Only tokenId/symbol matter for display + matching.
				address: zeroAddress,
				decimals: isStablecoin ? 6 : 18,
				isStablecoin,
			};
		},
		[cryptoOptions.chains],
	);

	/**
	 * Idempotent success transition — guards against double onSuccess() when
	 * FE-driven confirm and polling detect COMPLETED in the same render cycle.
	 */
	const transitionToSuccess = useCallback(() => {
		if (successTransitioned.current) return;
		successTransitioned.current = true;
		setStep('success');
		// Pass the checkout-time quantity captured in confirmedTicketQuantity ref,
		// not the parent's live ticketQuantity prop which can drift during the
		// 30-120s confirming window if the user changes the ticket selector.
		onSuccess?.(confirmedTicketQuantity.current);
	}, [onSuccess]);

	/**
	 * Applies the canonical runtime state for the current checkout attempt.
	 *
	 * Centralizing these resets avoids subtle drift between review fallback,
	 * confirming recovery, pay-time revalidation, and full modal reset.
	 */
	const applyCheckoutRuntimeState = useCallback(
		({
			txHash: nextTxHash,
			txSubmitted: nextTxSubmitted,
			submitRecoveryMode: nextSubmitRecoveryMode = null,
			finalizationRequested: nextFinalizationRequested = false,
			backendTrackedHash = null,
			backendOwnsTx = false,
			fundsAtRisk: nextFundsAtRisk = false,
			retryBlocked: nextRetryBlocked = false,
			errorMessage: nextErrorMessage = null,
		}: CheckoutRuntimeState) => {
			setTxHash(nextTxHash);
			setTxSubmitted(nextTxSubmitted);
			setSubmitRecoveryMode(nextSubmitRecoveryMode);
			setFinalizationRequested(nextFinalizationRequested);
			setFundsAtRisk(nextFundsAtRisk);
			setRetryBlocked(nextRetryBlocked);
			setErrorMessage(nextErrorMessage);

			submitRequestInFlight.current = false;
			submitRetriedHashes.current.clear();
			lastReplacementReason.current = null;
			txConfirmRequested.current = false;
			txConfirmInFlight.current = false;
			reorgHandled.current = false;
			successTransitioned.current = false;
			backendTrackedTxHash.current = backendTrackedHash
				? normalizeTxHash(backendTrackedHash)
				: null;
			txSubmittedToBackend.current = backendOwnsTx;
			resetWriteContract();
		},
		[resetWriteContract],
	);

	/**
	 * Applies the session-bound selection state shared by review and confirming.
	 *
	 * Backend checkout recovery is authoritative for chain/token/session identity.
	 * Keeping this grouped avoids partially-updated combinations during recovery.
	 */
	const applyCheckoutSessionState = useCallback(
		({
			checkoutSession,
			checksummedAddress,
			token,
		}: {
			checkoutSession: CryptoCheckoutSession;
			checksummedAddress: Address;
			token: RaffleCryptoToken;
		}) => {
			setSelectedChainId(checkoutSession.chainId);
			setSelectedToken(token);
			setSession(checkoutSession);
			setSessionTokenId(token.tokenId);
			setSessionWalletAddress(checksummedAddress);
		},
		[],
	);

	/**
	 * Applies authoritative server session state to local checkout.
	 *
	 * Shared by initial hydration (wallet-ready) and pay-time revalidation
	 * to avoid duplicating the ~30-line session→state mapping.
	 *
	 * @returns 'success' | 'failure' | 'step' indicating the transition outcome
	 */
	const applyServerHydration = useCallback(
		({
			serverSession,
			checkoutSession,
			checksummedAddress,
			fallbackToken,
			nextStep,
		}: ApplyServerHydrationParams): 'success' | 'failure' | 'step' => {
			const recoveredToken = buildRecoveredToken(
				serverSession.currency,
				checkoutSession.chainId,
				fallbackToken,
			);
			const hydratedCheckoutSession = {
				...checkoutSession,
				submitDeadline: serverSession.submitDeadline,
				confirmDeadline: serverSession.confirmDeadline,
			};
			// Validate txHash format before casting — backend returns plain string, but wagmi
			// hooks (useWaitForTransactionReceipt, useTransactionConfirmations) expect strict
			// `0x${string}`. Reject malformed hashes at hydration rather than propagating them
			// into hook state where they'd cause silent RPC failures.
			const recoveredTxHash: `0x${string}` | null =
				serverSession.txHash && isValidTxHash(serverSession.txHash)
					? (serverSession.txHash as `0x${string}`)
					: null;

			// Backend checkout recovery can return stored chain/token values instead of
			// the user's latest FE selection. Always overwrite with server truth so
			// review/confirming flows use the exact session the backend will verify.
			applyCheckoutSessionState({
				checkoutSession: hydratedCheckoutSession,
				checksummedAddress,
				token: recoveredToken,
			});
			applyCheckoutRuntimeState({
				txHash: recoveredTxHash ?? undefined,
				txSubmitted: nextStep === 'confirming' ? true : !!recoveredTxHash,
				backendTrackedHash: recoveredTxHash,
				backendOwnsTx: nextStep === 'confirming' || !!recoveredTxHash,
				errorMessage:
					nextStep === 'failure'
						? (serverSession.failureReason ?? FALLBACK_FAILURE_MESSAGE)
						: null,
			});

			if (nextStep === 'success') {
				transitionToSuccess();
				return 'success';
			}

			if (nextStep === 'failure') {
				setStep('failure');
				return 'failure';
			}

			setStep(nextStep);
			return 'step';
		},
		[
			applyCheckoutRuntimeState,
			applyCheckoutSessionState,
			buildRecoveredToken,
			transitionToSuccess,
		],
	);

	/**
	 * Clears the delayed close-reset timer.
	 *
	 * Why this exists:
	 * - the modal instance stays mounted while the same order id is reused
	 * - a stale 300ms timeout from the previous close can otherwise wipe a newly
	 *   reopened modal after the user already resumed the flow
	 */
	const clearCloseResetTimeout = useCallback(() => {
		if (closeResetTimeout.current) {
			clearTimeout(closeResetTimeout.current);
			closeResetTimeout.current = null;
		}
	}, []);

	/**
	 * Returns whether an async bootstrap attempt is still the latest live attempt.
	 *
	 * This gates all post-await state writes for wallet verification and session
	 * hydration so closing the modal or starting over cannot resurrect stale data.
	 */
	const isPreConfirmingFlowCurrent = useCallback(
		(flowVersion: number) => preConfirmingFlowVersion.current === flowVersion,
		[],
	);

	/**
	 * Invalidates in-flight pre-confirming work and clears any loading spinner it owns.
	 *
	 * We only use this before the flow reaches `confirming`. Once a tx exists, the
	 * modal intentionally keeps state alive across closes so polling can continue.
	 */
	const invalidatePreConfirmingFlow = useCallback(() => {
		preConfirmingFlowVersion.current += 1;
		walletReadyInFlight.current = false;
		setIsProcessing(false);
	}, []);

	/**
	 * Clears any session that was bound to an older wallet or expired review state.
	 *
	 * Chain/token selection stay intact so the user only needs to re-run the wallet
	 * step; forcing them back through chain selection would add friction without
	 * improving correctness.
	 */
	const clearSessionBoundCheckout = useCallback(() => {
		setSession(null);
		setSessionTokenId(null);
		setSessionWalletAddress(null);
		payInFlight.current = false;
		setIsProcessing(false);
		applyCheckoutRuntimeState({
			txHash: undefined,
			txSubmitted: false,
		});
	}, [applyCheckoutRuntimeState]);

	/**
	 * Returns the user to the wallet step when the current review session is no longer sendable.
	 *
	 * We fail closed before any transfer prompt:
	 * - wallet-bound sessions must be recreated if the connected account changed
	 * - expired sessions must be recreated so the backend accepts the eventual tx hash
	 */
	const returnToWalletStep = useCallback(
		(reason: 'wallet-changed' | 'session-expired', message?: string) => {
			clearSessionBoundCheckout();
			setStep('connect-wallet');
			if (message) {
				toast.error(message);
				return;
			}
			toast.info(
				reason === 'wallet-changed'
					? 'Wallet changed. Continue again to refresh this crypto checkout.'
					: 'Checkout session expired. Continue again to refresh this crypto checkout.',
			);
		},
		[clearSessionBoundCheckout],
	);

	/**
	 * Hydrates FE state from the backend-owned crypto session.
	 *
	 * This is the recovery bridge for refresh/session-resume cases:
	 * - checkout creation is idempotent server-side and may return an existing session
	 * - a follow-up session read tells the FE whether it should render review,
	 *   confirming, success, or failure
	 * - if the immediate read fails, stay on review and let `handlePay()` re-read
	 *   authoritative backend state before any transfer is broadcast
	 */
	const hydrateCheckoutSession = useCallback(
		async ({
			checkoutSession,
			checksummedAddress,
			fallbackToken,
			flowVersion,
		}: {
			checkoutSession: CryptoCheckoutSession;
			checksummedAddress: Address;
			fallbackToken: RaffleCryptoToken;
			flowVersion: number;
		}) => {
			const sessionResult = await getCryptoSession(checkoutSession.id);
			if (!isPreConfirmingFlowCurrent(flowVersion)) return false;

			// Inline hydration decision — if session read failed, fall back to review.
			// handlePay() re-reads the session authoritatively before any wallet prompt,
			// so the FE never broadcasts based only on this stale local snapshot.
			if (!sessionResult.success) {
				applyCheckoutSessionState({
					checkoutSession,
					checksummedAddress,
					token: fallbackToken,
				});
				applyCheckoutRuntimeState({
					txHash: undefined,
					txSubmitted: false,
				});
				setStep('review');
				return true;
			}

			const nextStep = getHydratedCheckoutStep(sessionResult.data.status);
			const outcome = applyServerHydration({
				serverSession: sessionResult.data,
				checkoutSession,
				checksummedAddress,
				fallbackToken,
				nextStep,
			});
			return outcome !== 'failure';
		},
		[
			applyCheckoutSessionState,
			applyServerHydration,
			applyCheckoutRuntimeState,
			isPreConfirmingFlowCurrent,
		],
	);

	/**
	 * Registers the current tx hash with backend.
	 *
	 * Same-hash retries are safe and useful:
	 * - if the first request timed out after commit, backend returns the current state
	 * - if the first request never reached backend, the retry establishes `confirming`
	 */
	const registerTxHashWithBackend = useCallback(
		async (hash: `0x${string}`) => {
			if (!session) {
				return {
					kind: CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL,
					error: PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND,
				} as const;
			}
			if (submitRequestInFlight.current) {
				return { kind: CRYPTO_TX_SUBMIT_OUTCOME.POLL } as const;
			}

			submitRequestInFlight.current = true;

			try {
				const normalizedHash = normalizeTxHash(hash);
				const result = await submitCryptoTx({
					sessionId: session.id,
					txHash: hash,
				});

				if (result.success) {
					backendTrackedTxHash.current = normalizedHash;
					txSubmittedToBackend.current = true;
					setSubmitRecoveryMode(null);
					return { kind: 'accepted' as const };
				}

				const outcome = getCryptoTxSubmitOutcome(result.error);

				if (outcome === CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL) {
					return {
						kind: CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL,
						error: result.error,
					} as const;
				}

				setSubmitRecoveryMode(outcome);
				return { kind: outcome, error: result.error } as const;
			} finally {
				submitRequestInFlight.current = false;
			}
		},
		[session],
	);

	// ---- Confirmation tracking ----
	// Tracks live confirmation block count for display in the confirming step.
	// wagmi polls the RPC for the tx's block number vs current block.
	const confirmingEnabled = step === 'confirming' && !!txHash;
	// Read from the session's backend-provided value — eliminates FE config lookup.
	// null when no session exists yet (pre-checkout steps).
	const confirmationTarget = session?.confirmationTarget ?? null;

	const { data: confirmationCount } = useTransactionConfirmations({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		query: {
			enabled: confirmingEnabled,
			// Poll every 4s — slightly less than block time on most L2s,
			// fast enough to show progress without excessive RPC calls
			refetchInterval: confirmingEnabled ? 4_000 : false,
		},
	});
	const observedConfirmationCount =
		getObservedConfirmationCount(confirmationCount);

	/**
	 * Handles wagmi's onReplaced event for speed-up/cancel tx replacements.
	 *
	 * Two paths:
	 * 1. Wallet-cancelled before backend bound a hash → clean unwind to review step.
	 * 2. Replacement tx (speed-up or repriced) → follow the new hash. If backend already
	 *    accepted a different hash, the mismatch effect downstream will surface a support message.
	 */
	function handleTransactionReplaced(replacement: {
		reason: 'cancelled' | 'replaced' | 'repriced';
		transaction: { hash: `0x${string}` };
	}) {
		lastReplacementReason.current = replacement.reason;

		// If the wallet cancelled before backend accepted any hash, unwind cleanly
		// back to review — no payment tx remains to reconcile.
		if (
			replacement.reason === 'cancelled' &&
			!backendTrackedTxHash.current &&
			!txSubmittedToBackend.current
		) {
			applyCheckoutRuntimeState({ txHash: undefined, txSubmitted: false });
			payInFlight.current = false;
			toast.info('Transaction cancelled.');
			setStep('review');
			return;
		}

		// Follow the replacement hash while backend is still unbound.
		// If backend already accepted a different hash, the mismatch effect below
		// will stop the flow with a clear support message.
		setTxHash(replacement.transaction.hash);
		setSubmitRecoveryMode(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
		submitRetriedHashes.current.delete(
			normalizeTxHash(replacement.transaction.hash),
		);
		reorgHandled.current = false;
		// Allow handlePay to run again if the replacement flow leads back to review.
		// Without this, a terminal path that skips handleReset leaves payInFlight
		// permanently true, silently blocking all future pay attempts.
		payInFlight.current = false;
	}

	useWaitForTransactionReceipt({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		// 1 — fires onReplaced on first block inclusion. Using confirmationTarget
		// here would delay replacement detection on high-finality chains (e.g.
		// Ethereum 12 blocks). Actual finalization is tracked via confirmationTarget.
		confirmations: 1,
		pollingInterval: 4_000,
		onReplaced: handleTransactionReplaced,
		query: {
			enabled: confirmingEnabled,
		},
	});

	// ---- Reorg detection ----
	// Fetches the tx object from the RPC. If the tx was included in a block that got
	// reorged, the RPC errors (tx no longer exists in the canonical chain).
	// We still need the exact error object because generic request failures are
	// recoverable noise; only `TransactionNotFoundError` should trigger reorg logic.
	const { error: txError, failureCount: txFailureCount } = useTransaction({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		query: {
			enabled: confirmingEnabled,
			// Poll less frequently — reorgs are rare, 8s is plenty
			refetchInterval: confirmingEnabled ? 8_000 : false,
			// Retry once before concluding tx is gone — transient RPC errors are common
			retry: 1,
		},
	});

	// ERC20 token balance — read balanceOf + decimals + symbol individually.
	// Individual useReadContract calls instead of useReadContracts because:
	// 1. useReadContracts uses multicall3 which can silently return zero when
	//    the wallet is connected to a different chain than the target chainId
	// 2. Individual calls route directly to the target chain's RPC transport,
	//    bypassing multicall aggregation issues with cross-chain reads
	const tokenAddress = session?.tokenAddress as `0x${string}` | undefined;
	const targetChainId = selectedChainId ?? undefined;
	// Once a checkout session exists, keep all ERC20 balance reads pinned to the
	// wallet that owns that session. This prevents wallet switches during confirming
	// from making the reorg safety path inspect the wrong account.
	const balanceReadAddress: Address | null =
		sessionWalletAddress ?? checksummedAddress;
	const tokenQueryEnabled = !!tokenAddress && !!balanceReadAddress;

	// ---- Balance recheck for reorg recovery ----
	// Separate balance read that's only enabled during confirming to detect if funds
	// were actually deducted after a suspected reorg. Shares the same wagmi cache entry
	// as the review-step balance read (same contract params = same query key).
	// This is harmless — both want fresh balance data and refetch updates both.
	const { refetch: refetchConfirmingBalance } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: balanceReadAddress ? [balanceReadAddress] : undefined,
		chainId: targetChainId,
		query: { enabled: confirmingEnabled && tokenQueryEnabled },
	});

	// Native token balance (ETH/MATIC) — shown as gas indicator
	const { data: nativeBalance } = useBalance({
		address,
		chainId: selectedChainId ?? undefined,
	});

	const {
		data: rawBalance,
		isLoading: isBalanceLoading,
		isError: isBalanceError,
	} = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: balanceReadAddress ? [balanceReadAddress] : undefined,
		chainId: targetChainId,
		query: { enabled: tokenQueryEnabled },
	});

	const { data: rawDecimals, isLoading: isDecimalsLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'decimals',
		chainId: targetChainId,
		query: { enabled: tokenQueryEnabled },
	});

	const { data: rawSymbol, isLoading: isSymbolLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'symbol',
		chainId: targetChainId,
		query: { enabled: tokenQueryEnabled },
	});

	const isTokenBalanceLoading =
		isBalanceLoading || isDecimalsLoading || isSymbolLoading;

	// Shape token data to match the interface ReviewStep expects.
	// All three values must be present — partial data would show wrong symbol or balance.
	const tokenBalance = useMemo(() => {
		if (
			rawBalance === undefined ||
			rawDecimals === undefined ||
			rawSymbol === undefined
		)
			return undefined;
		// erc20Abi is fully typed — useReadContract infers balanceOf→bigint,
		// decimals→number, symbol→string. No cast needed after the undefined guard above.
		return {
			value: rawBalance,
			decimals: rawDecimals,
			symbol: rawSymbol,
		};
	}, [rawBalance, rawDecimals, rawSymbol]);

	// Backend hooks
	const { data: walletsData, refetch: refetchWallets } = useWallets({
		// Guard on userId — without auth, getWallets returns 401 silently
		enabled: open && !!userId,
	});
	// Order/session polling should live for exactly the same remaining grace window
	// as the expiry timer. Otherwise the modal can stop receiving backend state
	// updates long before the backend has actually given up on the payment.
	//
	// Wrapped in useMemo keyed to stable deps — getCryptoSessionGraceWindowMs calls
	// Date.now() internally, so an inline const would produce a new shrinking value
	// every render. That would reset the polling hooks' useEffect (which depends on
	// resolvedMaxDurationMs), causing isExpired to flicker false→true on each cycle.
	const confirmingPollWindowMs = useMemo(() => {
		if (step !== 'confirming' || !session) return undefined;
		// After tx submission, use the longer confirming deadline;
		// before submission, use the shorter submit deadline.
		const deadline = txHash ? session.confirmDeadline : session.submitDeadline;
		return getCryptoSessionGraceWindowMs(deadline);
		// Only the deadline strings matter for the poll window computation.
		// Including the full session object would cause unnecessary recomputation
		// on every session reference change (e.g. revalidation refresh).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, session?.submitDeadline, session?.confirmDeadline, txHash]);
	// Avoid polling the backend while the wallet signature/send prompt is still open.
	// We start polling once there is a tx hash, a submit recovery path, or we know
	// backend already owns the session (txSubmittedToBackend is true from polling).
	const shouldPollConfirmingState =
		step === 'confirming' && (!!txHash || submitRecoveryMode !== null);
	// orderId is derived from atomic checkout response — stored as internal state
	const orderId = session?.orderId ?? null;
	const { data: polledCheckoutStatus } = usePollCheckoutStatus(
		shouldPollConfirmingState ? orderId : null,
		confirmingPollWindowMs,
	);

	/**
	 * Gets tokens for a chain from the raffle's pre-computed crypto options.
	 * Backend already filtered by allowlist and pricing — no client-side logic needed.
	 */
	const getTokensForChain = useCallback(
		(chainId: number): RaffleCryptoToken[] =>
			cryptoOptions.chains.find(c => c.chainId === chainId)?.tokens ?? [],
		[cryptoOptions.chains],
	);

	// ==========================================
	// Derived State
	// ==========================================

	/**
	 * Resolved chain options — filtered to chains the current FE runtime can actually
	 * drive and that still have at least one token. Keep this in the same helper the
	 * outer CTA uses so the page cannot advertise a crypto path the modal cannot render.
	 */
	const selectableChains = useMemo(
		() => getSelectableCryptoChains(cryptoOptions, SUPPORTED_WEB3_CHAIN_IDS),
		[cryptoOptions],
	);
	const resolvedChainIds = useMemo(
		() => selectableChains.map(chain => chain.chainId),
		[selectableChains],
	);

	/**
	 * Checks if current wallet address is already verified on backend
	 */
	const isWalletVerified = useMemo(() => {
		if (!address || !walletsData?.wallets) return false;
		return walletsData.wallets.some(
			w => w.address.toLowerCase() === address.toLowerCase(),
		);
	}, [address, walletsData]);

	/**
	 * Whether user is on the correct chain for the selected checkout
	 */
	const isCorrectChain = selectedChainId === connectedChainId;

	/**
	 * Display symbol for the selected token — used across review and warning UI
	 */
	const tokenSymbol = selectedToken?.symbol ?? 'USDC';

	/**
	 * Local review guard for obviously stale sessions.
	 *
	 * This is intentionally advisory, not authoritative. `handlePay` still re-reads
	 * backend state immediately before any transfer so review cannot drift into a send.
	 */
	const reviewSessionBlockMessage = useMemo(() => {
		const reviewGuard = getReviewSessionGuard({
			connectedAddress: checksummedAddress,
			sessionWalletAddress,
			submitDeadline: session?.submitDeadline,
		});

		switch (reviewGuard.kind) {
			case 'wallet-changed':
				return 'Wallet changed. Continue again to bind the current wallet.';
			case 'session-expired':
				return 'Checkout session expired. Continue again to refresh it.';
			default:
				return null;
		}
	}, [checksummedAddress, session?.submitDeadline, sessionWalletAddress]);

	// ==========================================
	// Effects
	// ==========================================

	/**
	 * Notify parent of confirming state changes — drives the persistent
	 * "pending transaction" button in CryptoBuyButton.
	 * Fires on step transitions to/from 'confirming'.
	 */
	useEffect(() => {
		onConfirmingChange?.(step === 'confirming');
	}, [step, onConfirmingChange]);

	/**
	 * Reopen cancels any delayed reset scheduled by the previous close.
	 * Without this, the stale timeout can wipe a resumed modal mid-interaction.
	 */
	useEffect(() => {
		if (!open) return;
		clearCloseResetTimeout();
	}, [clearCloseResetTimeout, open]);

	/**
	 * Order polling is authoritative for whether backend has accepted a hash.
	 *
	 * This closes the "response lost after commit" gap:
	 * - submit POST may succeed server-side but fail client-side on the way back
	 * - polling the order gives FE the same truth without trusting the submit response
	 */
	useEffect(() => {
		if (step !== 'confirming') return;

		const txHashSyncDecision = getPolledTxHashSyncDecision({
			localTxHash: txHash,
			polledTxHash: polledCheckoutStatus?.crypto?.txHash,
		});
		if (txHashSyncDecision.kind === 'noop') return;

		// Skip no-op updates once backend ownership is tracked and any missing
		// local hash has already been restored from polling.
		if (
			txSubmittedToBackend.current &&
			backendTrackedTxHash.current ===
				txHashSyncDecision.normalizedBackendHash &&
			!txHashSyncDecision.adoptLocalTxHash
		) {
			return;
		}

		backendTrackedTxHash.current = txHashSyncDecision.normalizedBackendHash;
		txSubmittedToBackend.current = true;
		setSubmitRecoveryMode(null);
		if (txHashSyncDecision.adoptLocalTxHash) {
			setTxHash(txHashSyncDecision.adoptLocalTxHash);
		}
	}, [step, polledCheckoutStatus?.crypto?.txHash, txHash]);

	/**
	 * One bounded same-hash retry after ambiguous submit failures.
	 *
	 * Why only once:
	 * - same-hash submit is idempotent on backend, so one retry is safe
	 * - repeated retries would just amplify backend load during outages
	 * - if one retry + polling still don't converge, timeout/failure handling takes over
	 */
	useEffect(() => {
		if (
			step !== 'confirming' ||
			!txHash ||
			submitRecoveryMode !== CRYPTO_TX_SUBMIT_OUTCOME.RETRY
		)
			return;
		if (
			!session ||
			txSubmittedToBackend.current ||
			polledCheckoutStatus?.crypto?.txHash
		)
			return;

		const normalizedHash = normalizeTxHash(txHash);
		if (submitRetriedHashes.current.has(normalizedHash)) return;

		const timer = setTimeout(async () => {
			submitRetriedHashes.current.add(normalizedHash);

			const outcome = await registerTxHashWithBackend(txHash);

			if (outcome.kind === CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL) {
				failSubmittedTxRegistration();
			}
			// 3s: below the 5s poll interval so the retry lands before the first
			// poll tick, maximising the chance backend converges without extra polls.
		}, 3_000);

		return () => clearTimeout(timer);
	}, [
		step,
		txHash,
		submitRecoveryMode,
		session,
		polledCheckoutStatus?.crypto?.txHash,
		registerTxHashWithBackend,
		failSubmittedTxRegistration,
	]);

	/**
	 * Detect when the wallet's canonical hash diverges from the backend-tracked hash.
	 *
	 * This is the irreducible backend-contract edge case from PR 40:
	 * once backend is bound to hash A, a later wallet replacement to hash B cannot be
	 * reconciled client-side. Surface that explicitly instead of pretending the flow
	 * can still finalize normally.
	 */
	useEffect(() => {
		if (step !== 'confirming' || !txHash) return;

		const trackedHash = backendTrackedTxHash.current;
		if (!trackedHash) return;

		if (normalizeTxHash(txHash) === trackedHash) return;

		failBackendTrackedReplacement(lastReplacementReason.current);
	}, [
		step,
		txHash,
		// Proxy dep: the body reads backendTrackedTxHash.current (a ref, not reactive).
		// Including the polled hash here triggers a re-evaluation after each poll tick
		// that updates backendTrackedTxHash via the hash-sync effect above.
		// Without this, the effect would only fire on txHash changes and miss backend
		// hash updates from polling (e.g. cron assigned a different hash).
		polledCheckoutStatus?.crypto?.txHash,
		failBackendTrackedReplacement,
	]);

	/**
	 * FE-driven finalization — when on-chain confirmations reach the chain's target,
	 * proactively ask backend to finalize the payment instead of waiting for the cron.
	 *
	 * This is an optimization, not a requirement:
	 * - If backend already moved the order to COMPLETED (cron was faster), this is a no-op
	 * - If backend hasn't processed yet, it validates the tx and finalizes synchronously
	 * - On failure, we don't transition to error — polling/cron remain as fallback
	 *
	 * Fires after txSubmittedToBackend (hash must be known to backend first).
	 * Uses txConfirmRequested ref for idempotency — exactly one call per tx.
	 */
	useEffect(() => {
		if (
			step !== 'confirming' ||
			!txHash ||
			!session ||
			!selectedChainId ||
			confirmationTarget === null
		)
			return;
		// Wait until submit-tx succeeded — backend needs the hash first
		if (!txSubmittedToBackend.current) return;
		// Only one in-flight confirm request at a time, and stop once backend accepted one.
		if (txConfirmRequested.current || txConfirmInFlight.current) return;

		if (observedConfirmationCount < confirmationTarget) return;
		const sessionId = session.id;
		const chainId = selectedChainId;
		const confirmedTxHash = txHash;

		async function requestConfirmation() {
			txConfirmInFlight.current = true;
			try {
				const result = await confirmCryptoTx({
					sessionId,
					txHash: confirmedTxHash,
					chainId,
					confirmations: observedConfirmationCount,
				});

				if (!result.success) {
					// Non-fatal — polling/cron will finalize eventually.
					// Schedule a retry via confirmRetryTick so this effect re-fires even when
					// observedConfirmationCount hasn't changed (common on L2 chains where
					// confirmationTarget=1 and block count plateaus immediately).
					// 5s delay stays below the poll interval to land before the next poll tick.
					console.error(
						'FE-driven confirm failed, scheduling retry:',
						result.error,
					);
					confirmRetryTimerRef.current = setTimeout(() => {
						confirmRetryTimerRef.current = null;
						setConfirmRetryTick(t => t + 1);
					}, 5_000);
					return;
				}

				// Backend confirmed — session status 'completed' means tickets created.
				// successTransitioned ref prevents double onSuccess() when polling
				// also detects COMPLETED in the same render cycle.
				if (result.data.status === CRYPTO_PAYMENT_STATUS.COMPLETED) {
					// Only lock the idempotency guard on COMPLETED — non-terminal statuses
					// (e.g. backend returned FAILED during grace-period) should remain
					// retryable so the next confirmRetryTick or confirmation-count change
					// can re-trigger this effect.
					txConfirmRequested.current = true;
					setFinalizationRequested(true);
					transitionToSuccess();
				}
				// Any other status: cron/polling will handle the final transition
			} finally {
				txConfirmInFlight.current = false;
			}
		}

		void requestConfirmation();
	}, [
		step,
		txHash,
		session,
		selectedChainId,
		confirmationTarget,
		observedConfirmationCount,
		// confirmRetryTick bumps on transient failure to re-trigger this effect
		// when observedConfirmationCount has already plateaued at the target.
		confirmRetryTick,
		transitionToSuccess,
	]);

	/**
	 * Transition to success/failure when polling detects terminal state.
	 * Order now includes nested cryptoSession object — no separate session poll needed.
	 */
	useEffect(() => {
		if (!polledCheckoutStatus || step !== 'confirming') return;

		if (polledCheckoutStatus.phase === CHECKOUT_PHASE.COMPLETED) {
			transitionToSuccess();
		} else if (polledCheckoutStatus.phase === CHECKOUT_PHASE.FAILED) {
			// canRetry on a FAILED phase means backend grace-period reactivation is possible —
			// the cron may find the tx on-chain and transition back to confirming.
			// Stay in confirming step and let polling detect the recovery.
			if (polledCheckoutStatus.canRetry) return;

			const reason =
				polledCheckoutStatus.crypto?.failureReason ?? FALLBACK_FAILURE_MESSAGE;
			setErrorMessage(reason);
			setStep('failure');
		} else if (polledCheckoutStatus.phase === CHECKOUT_PHASE.AWAITING_PAYMENT) {
			// Session expired or was abandoned while we were confirming — no active tx
			// to wait for. Transition to failure immediately instead of waiting for poll timeout.
			if (!polledCheckoutStatus.crypto?.txHash) {
				setErrorMessage('Payment session expired. Please try again.');
				setStep('failure');
			}
			// else: txHash present but phase is awaiting_payment — this transient state
			// means the backend hasn't advanced to confirming yet (e.g. cron hasn't run).
			// Safe to continue polling; the cron or next poll tick will move to confirming.
		}
	}, [polledCheckoutStatus, step, transitionToSuccess]);

	/**
	 * Cancel the confirm-retry timer when leaving the confirming step.
	 * Without this, a 5s retry timer set in requestConfirmation() can fire
	 * after polling transitions to terminal state, causing a spurious
	 * confirmCryptoTx call on an already-completed or failed session.
	 */
	useEffect(() => {
		if (step === 'confirming') return;
		if (confirmRetryTimerRef.current) {
			clearTimeout(confirmRetryTimerRef.current);
			confirmRetryTimerRef.current = null;
		}
	}, [step]);

	/**
	 * Reorg detection — only fires when the RPC specifically reports that the
	 * transaction no longer exists, not when the provider is merely flaky.
	 *
	 * Recovery flow:
	 * 1. Detect tx gone (`TransactionNotFoundError` with 2+ consecutive failures)
	 * 2. Recheck the user's token balance on-chain
	 * 3a. If balance ≥ payment amount → funds weren't deducted → safe to retry
	 * 3b. If balance < payment amount → funds were deducted but tx vanished → contact support
	 *
	 * Only triggers after txSubmittedToBackend (we have a hash and entered confirming).
	 * The failure count threshold (2) prevents false positives from one-off "not found"
	 * responses while the RPC is still catching up to a freshly-broadcast tx.
	 */
	useEffect(() => {
		if (step !== 'confirming' || !txHash) return;
		if (!txSubmittedToBackend.current) return;

		// `useTransaction` multiplexes request errors and typed "not found" errors
		// through the same query state. Only the viem not-found class is strong
		// enough evidence for a reorg path; generic RPC failures must keep polling.
		const txLikelyGone = txFailureCount >= 2 && isTransactionNotFound(txError);

		if (!txLikelyGone) return;
		// Idempotency guard — prevents concurrent handlePossibleReorg executions
		// when txFailureCount increments multiple times while refetch is pending
		if (reorgHandled.current) return;
		reorgHandled.current = true;

		async function handlePossibleReorg() {
			// Recheck balance to determine if funds left the wallet
			const { data: freshBalance } = await refetchConfirmingBalance();

			// If the balance probe also failed, we still do not know whether the tx
			// actually vanished or the RPC is just degraded. Keep confirming alive and
			// let the next successful poll decide instead of forcing a false failure.
			if (freshBalance === undefined) {
				reorgHandled.current = false;
				return;
			}

			if (!session) {
				setErrorMessage(
					'Transaction may have been removed from the blockchain. Please contact support.',
				);
				setStep('failure');
				return;
			}

			const paymentAmount = BigInt(session.amountRaw);
			// If fresh balance covers the payment → funds weren't deducted → safe to retry
			const fundsStillAvailable = (freshBalance as bigint) >= paymentAmount;

			if (fundsStillAvailable) {
				setErrorMessage(
					'Your transaction was removed from the blockchain (chain reorganization). Your funds were not deducted — you can safely try again.',
				);
			} else {
				// Funds appear deducted but tx vanished — ambiguous state, need support.
				// fundsAtRisk disables "Try Again" in FailureStep to prevent duplicate payment.
				setFundsAtRisk(true);
				setErrorMessage(
					'Your transaction may have been affected by a chain reorganization. Please contact support with your transaction hash for assistance.',
				);
			}
			setStep('failure');
		}

		void handlePossibleReorg();
	}, [
		step,
		txHash,
		txError,
		txFailureCount,
		session,
		refetchConfirmingBalance,
	]);

	/**
	 * Session expiry timer — uses backend-provided deadlines directly.
	 *
	 * Before tx submission: expires at submitDeadline (shorter window).
	 * After tx submission: expires at confirmDeadline (longer window).
	 * The txHash state drives which deadline is active.
	 */
	useEffect(() => {
		if (step !== 'confirming' || !session) return;

		// After tx submission, use the longer confirming deadline;
		// before submission, use the shorter submit deadline.
		const deadline = txHash ? session.confirmDeadline : session.submitDeadline;
		const msUntilExpiry = getCryptoSessionGraceWindowMs(deadline);

		// Already beyond the backend grace window — transition immediately
		if (msUntilExpiry <= 0) {
			failConfirmingWindowExpired();
			return;
		}

		const timer = setTimeout(failConfirmingWindowExpired, msUntilExpiry);
		return () => clearTimeout(timer);
		// Only the deadline strings drive the timer — avoid re-arming the
		// setTimeout on unrelated session field changes by pinning to the
		// exact values this effect reads.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		failConfirmingWindowExpired,
		session?.submitDeadline,
		session?.confirmDeadline,
		step,
		txHash,
	]);

	// ==========================================
	// Handlers
	// ==========================================

	/**
	 * Step 1: User selects a chain.
	 * If chain has only one allowed token, auto-select it and skip token step.
	 * If multiple tokens, show token selector.
	 */
	function handleSelectChain(chainId: number) {
		setSelectedChainId(chainId);

		const tokens = getTokensForChain(chainId);

		// Single token available — auto-select and skip to wallet step.
		// tokens[0] is always defined here because resolvedChainIds pre-filters
		// chains that have zero allowed tokens.
		if (tokens.length <= 1) {
			setSelectedToken(tokens[0]!);
			setStep('connect-wallet');
			return;
		}

		// Multiple tokens — show token selector
		setStep('select-token');
	}

	/**
	 * Step 1b: User selects a token from available options for the chain.
	 */
	function handleSelectToken(token: RaffleCryptoToken) {
		setSelectedToken(token);
		setStep('connect-wallet');
	}

	/**
	 * Step 2: After wallet is connected, verify if needed then create/recover checkout session.
	 *
	 * Cross-method guard still starts with cancel, but `cancel:crypto-active`
	 * is a recovery signal now, not a hard failure:
	 * - Stripe/pending sessions should still be cancelled before we continue
	 * - active crypto sessions cannot be cancelled, so we immediately re-run
	 *   idempotent checkout creation and hydrate from the stored backend session
	 *
	 * EIP-191 signature message format must match backend exactly:
	 * "Link wallet {checksummedAddress} to Raffles account {userId} at {isoTimestamp}"
	 */
	async function handleWalletReady() {
		if (!checksummedAddress || !selectedChainId || !selectedToken) return;
		// Synchronous ref guard — same pattern as payInFlight for handlePay.
		if (walletReadyInFlight.current) return;
		walletReadyInFlight.current = true;
		const flowVersion = preConfirmingFlowVersion.current + 1;
		preConfirmingFlowVersion.current = flowVersion;
		clearCloseResetTimeout();

		setIsProcessing(true);

		try {
			// Verify wallet if not already verified
			if (!isWalletVerified) {
				if (!userId) {
					toast.error('Please sign in to verify your wallet.');
					return;
				}

				const timestamp = new Date().toISOString();
				const message = `Link wallet ${checksummedAddress} to Raffles account ${userId} at ${timestamp}`;

				const signature = await signMessageAsync({ message });

				const result = await verifyWallet({
					address: checksummedAddress,
					message,
					signature,
					timestamp,
				});

				if (!result.success) {
					toast.error(getWalletErrorMessage(result.error));
					return;
				}

				await refetchWallets();
				if (!isPreConfirmingFlowCurrent(flowVersion)) return;
			}

			// Re-read backend state even when a local session looks reusable.
			// Local review data only proves chain/token/wallet continuity; it does not prove
			// the backend session is still pending rather than already confirming/terminal.

			/** Checks if current session matches selected chain/token and is still in sendable state */
			function isExistingSessionReusable(): boolean {
				if (!session) return false;
				if (session.chainId !== selectedChainId) return false;
				if (!selectedToken || sessionTokenId !== selectedToken.tokenId)
					return false;
				return (
					getReviewSessionGuard({
						connectedAddress: checksummedAddress,
						sessionWalletAddress,
						submitDeadline: session.submitDeadline,
					}).kind === 'ready'
				);
			}

			const existingSessionValid = isExistingSessionReusable();

			if (existingSessionValid) {
				// session and selectedToken are guaranteed non-null by isExistingSessionReusable()
				await hydrateCheckoutSession({
					checkoutSession: session!,
					checksummedAddress,
					fallbackToken: selectedToken!,
					flowVersion,
				});
				return;
			}

			// Snapshot the quantity at checkout creation time — the parent's ticketQuantity
			// prop can drift during the 30-120s confirming window if the user changes the slider.
			confirmedTicketQuantity.current = ticketQuantity;

			// Atomic checkout: creates order + crypto session in one backend call.
			// Backend handles order reuse, promo redemption, and cross-method cancellation.
			const checkoutResult = await createAtomicCryptoCheckout({
				raffleId,
				ticketQuantity,
				promoCode,
				chainId: selectedChainId,
				walletAddress: checksummedAddress,
				token: selectedToken.tokenId,
			});
			if (!isPreConfirmingFlowCurrent(flowVersion)) return;

			if (!checkoutResult.success) {
				// Handle promo-specific errors — notify parent to clear invalid promo
				if (shouldClearPromo(checkoutResult.error)) {
					onPromoInvalid?.();
				}
				setErrorMessage(getPaymentErrorMessage(checkoutResult.error));
				setStep('failure');
				return;
			}

			// $0 order — promo covered entire amount, backend auto-completed
			if (!checkoutResult.data.session) {
				toast.success('Promo applied. Tickets claimed successfully!');
				onSuccess?.(confirmedTicketQuantity.current);
				onOpenChange(false);
				return;
			}

			await hydrateCheckoutSession({
				checkoutSession: checkoutResult.data.session,
				checksummedAddress,
				fallbackToken: selectedToken,
				flowVersion,
			});
		} catch (error) {
			if (!isPreConfirmingFlowCurrent(flowVersion)) return;
			if (isUserRejection(error)) {
				toast.info('Signature cancelled.');
			} else {
				toast.error('Signature failed. Please try again.');
			}
		} finally {
			// Always clear the in-flight ref — a leaked `true` makes handleWalletReady
			// permanently no-op if the modal is closed and reopened during execution.
			walletReadyInFlight.current = false;
			if (!isPreConfirmingFlowCurrent(flowVersion)) return;
			setIsProcessing(false);
		}
	}

	/**
	 * Step 3: Switch chain if needed, execute ERC20 transfer
	 *
	 * Session is already created in handleWalletReady so amount is visible
	 * before user confirms the transaction.
	 *
	 * Flow:
	 * 1. Switch to selected chain (if not already on it)
	 * 2. Execute ERC20 transfer(treasuryAddress, amountRaw) via wagmi
	 * 3. Submit tx hash to backend immediately after broadcast so the session moves
	 *    to `confirming` before any cancel/switch flow can race it
	 * 4. Receipt + confirmation hooks track on-chain progress after backend knows the hash
	 */
	async function handlePay() {
		if (!checksummedAddress || !selectedChainId || !selectedToken || !session)
			return;
		// Synchronous ref guard — closes the double-click window that React state can't.
		// Two rapid clicks both execute before the first setTxSubmitted(true) re-renders.
		if (payInFlight.current) return;
		payInFlight.current = true;

		setIsProcessing(true);
		setErrorMessage(null);

		try {
			// Step 1: Reject obviously stale local review state before any wallet prompt.
			//         This prevents a new account from funding a session bound to the old one.
			const reviewGuard = getReviewSessionGuard({
				connectedAddress: checksummedAddress,
				sessionWalletAddress,
				submitDeadline: session.submitDeadline,
			});
			if (reviewGuard.kind === 'wallet-changed') {
				returnToWalletStep('wallet-changed');
				return;
			}
			if (reviewGuard.kind === 'session-expired') {
				returnToWalletStep('session-expired');
				return;
			}

			// Step 2: Revalidate backend state immediately before broadcast.
			//         Review can sit open for minutes; the server owns whether this
			//         session is still pending, already confirming, or terminal.
			const sessionResult = await getCryptoSession(session.id);
			if (!sessionResult.success) {
				const recoverableReadFailure =
					sessionResult.error !== PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED &&
					sessionResult.error !==
						PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND &&
					sessionResult.error !==
						PAYMENT_ERROR_CODES.CRYPTO_ORDER_NOT_RECOVERABLE;

				if (recoverableReadFailure) {
					payInFlight.current = false;
					setIsProcessing(false);
					toast.error('Unable to refresh checkout state. Please try again.');
					return;
				}

				returnToWalletStep(
					'session-expired',
					getPaymentErrorMessage(sessionResult.error),
				);
				return;
			}

			const serverSession = sessionResult.data;
			const sendDecision = getPaySessionRevalidationDecision({
				status: serverSession.status,
				submitDeadline: serverSession.submitDeadline,
			});

			if (sendDecision.kind === 'session-expired') {
				returnToWalletStep('session-expired');
				return;
			}

			if (sendDecision.kind === 'rehydrate') {
				applyServerHydration({
					serverSession,
					checkoutSession: session,
					checksummedAddress,
					fallbackToken: selectedToken,
					nextStep: sendDecision.nextStep,
				});
				payInFlight.current = false;
				setIsProcessing(false);
				return;
			}

			// Keep local session deadlines aligned with the server we just revalidated.
			setSession({
				...session,
				submitDeadline: serverSession.submitDeadline,
				confirmDeadline: serverSession.confirmDeadline,
			});

			// Switch chain if wallet is on a different network
			if (!isCorrectChain) {
				await switchChainAsync({ chainId: selectedChainId });
			}

			// Re-validate chain after async switch — some connectors resolve the switch
			// promise even when the user dismisses the prompt without changing chains.
			// Without this, writeContractAsync would fire on the wrong network.
			if (liveChainIdRef.current !== selectedChainId) {
				toast.error('Please switch to the correct network and try again.');
				payInFlight.current = false;
				setIsProcessing(false);
				return;
			}

			// Re-validate wallet binding after async chain switch.
			// The user can disconnect/reconnect a different wallet while approving the
			// chain switch prompt. checksummedAddress is a stale closure here, so read
			// the live ref to catch mid-flight wallet drift before any funds leave.
			const currentAddress = liveAddressRef.current;
			if (
				!currentAddress ||
				currentAddress.toLowerCase() !== sessionWalletAddress?.toLowerCase()
			) {
				returnToWalletStep('wallet-changed');
				return;
			}

			// Move to confirming before awaiting wallet broadcast.
			// This keeps the UI in the pending state the moment the user approves,
			// and avoids a stale "review" screen while wagmi starts producing tx data.
			//
			// Subtle sequence if user closes modal during wallet prompt:
			// 1. handleClose sees step==='confirming' → preserves state (no reset)
			// 2. User rejects wallet tx → catch block fires setStep('review')
			// 3. Modal is hidden but internally reverts to review — safe because
			//    no funds left the wallet and payInFlight ref is reset in catch.
			// This is intentional: the confirming-preservation path is more important
			// (real tx in-flight) than the brief invisible review snap-back on rejection.
			setTxSubmitted(true);
			setStep('confirming');

			// Execute ERC20 transfer
			// amountRaw is already in token's smallest unit (6 decimals for USDC, 18 for EARNM)
			const submittedTxHash = await writeContractAsync({
				address: session.tokenAddress as `0x${string}`,
				abi: erc20Abi,
				functionName: 'transfer',
				args: [
					session.treasuryAddress as `0x${string}`,
					BigInt(session.amountRaw),
				],
			});
			setTxHash(submittedTxHash);

			// Register the tx with backend immediately from the returned hash.
			// This closes the dangerous window where real funds are in-flight but
			// backend still sees a cancellable `pending` crypto session.
			const submitOutcome = await registerTxHashWithBackend(submittedTxHash);

			if (submitOutcome.kind === CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL) {
				setIsProcessing(false);
				failSubmittedTxRegistration();
				return;
			}

			// Retry/poll recovery keeps the step alive without punishing the user with
			// a false terminal failure when the submit response was merely ambiguous.
			setIsProcessing(false);
		} catch (error) {
			// Reset guards in catch only — on success path, payInFlight stays true to prevent
			// double-transfer if React re-renders before confirming step takes over.
			// handleReset clears everything when user retries or closes.
			payInFlight.current = false;
			setTxSubmitted(false);
			setIsProcessing(false);

			// User rejected the tx in their wallet — not an error, just stay on review
			if (isUserRejection(error)) {
				toast.info('Transaction cancelled.');
				// Return to review since we optimistically moved to confirming
				setStep('review');
				return;
			}

			console.error('Crypto payment error:', error);
			setRetryBlocked(false);
			setErrorMessage('Transaction failed. Please try again.');
			setStep('failure');
		}
	}

	/**
	 * Resets modal state for retry or close
	 */
	function handleReset() {
		clearCloseResetTimeout();
		// Cancel any pending confirm retry timer to prevent leaked state updates
		if (confirmRetryTimerRef.current) {
			clearTimeout(confirmRetryTimerRef.current);
			confirmRetryTimerRef.current = null;
		}
		invalidatePreConfirmingFlow();
		setStep('select-chain');
		setSelectedChainId(null);
		setSelectedToken(null);
		setSession(null);
		setSessionTokenId(null);
		setSessionWalletAddress(null);
		setIsProcessing(false);
		setErrorMessage(null);
		setFundsAtRisk(false);
		setRetryBlocked(false);
		setTxSubmitted(false);
		setTxHash(undefined);
		setSubmitRecoveryMode(null);
		setFinalizationRequested(false);
		setConfirmRetryTick(0);
		// Reset ref guards so retried flow can submit again
		walletReadyInFlight.current = false;
		payInFlight.current = false;
		submitRequestInFlight.current = false;
		txSubmittedToBackend.current = false;
		backendTrackedTxHash.current = null;
		submitRetriedHashes.current.clear();
		lastReplacementReason.current = null;
		txConfirmRequested.current = false;
		txConfirmInFlight.current = false;
		successTransitioned.current = false;
		reorgHandled.current = false;
		// Reset wagmi write state so stale txHash doesn't persist across retries
		resetWriteContract();
	}

	/**
	 * Close modal — preserves state during confirming step so user can reopen.
	 * Fully resets on all other steps (select, review, terminal).
	 */
	function handleClose() {
		onOpenChange(false);

		// During confirming: keep all state alive (session, txHash, polling).
		// User can reopen via the "pending transaction" button in CryptoBuyButton.
		if (step === 'confirming') return;

		// Best-effort abandon: if user reached review but didn't send tx,
		// tell backend to reclaim the order slot. Fire-and-forget — no await
		// needed, failure is harmless (order will expire naturally).
		// Skip when a real tx was broadcast (fundsAtRisk/retryBlocked) — BE rejects
		// abandon for active crypto sessions anyway, and user needs the session alive.
		// Invalidate first — cancels in-flight wallet-ready work before firing the abandon,
		// preventing late async completions from repopulating state into a closing modal.
		invalidatePreConfirmingFlow();

		if (session?.orderId && !fundsAtRisk && !retryBlocked) {
			void abandonOrder(session.orderId);
		}
		clearCloseResetTimeout();

		// 300ms matches Dialog close animation (data-[state=closed]:duration-300).
		// Must stay in sync — if animation duration changes, update this too.
		closeResetTimeout.current = setTimeout(() => {
			closeResetTimeout.current = null;
			handleReset();
		}, 300);
	}

	/**
	 * Navigate back one step
	 */
	function handleBack() {
		switch (step) {
			case 'select-token':
				setSelectedChainId(null);
				setSelectedToken(null);
				setStep('select-chain');
				break;
			case 'connect-wallet':
				// If chain has multiple allowed tokens, go back to token selector.
				// If auto-skipped, go back to chain selector.
				if (selectedChainId && getTokensForChain(selectedChainId).length > 1) {
					setSelectedToken(null);
					setStep('select-token');
				} else {
					setSelectedChainId(null);
					setSelectedToken(null);
					setStep('select-chain');
				}
				break;
			case 'review':
				// Keep session — reuse check in handleWalletReady skips API call
				// only when chain + token + verified sender wallet still match.
				setStep('connect-wallet');
				break;
			default:
				break;
		}
	}

	// ==========================================
	// Conditional Rendering Guards
	// ==========================================

	/** Whether the token selector step should render — requires chain selection */
	function shouldShowTokenSelector(): boolean {
		return step === 'select-token' && !!selectedChainId;
	}

	/** Whether the review step should render — requires chain selection */
	function shouldShowReviewStep(): boolean {
		return step === 'review' && !!selectedChainId;
	}

	/** Whether the confirming step should render — requires chain and confirmation target */
	function shouldShowConfirmingStep(): boolean {
		return (
			step === 'confirming' && !!selectedChainId && confirmationTarget !== null
		);
	}

	/** Whether the success step should render — requires chain selection */
	function shouldShowSuccessStep(): boolean {
		return step === 'success' && !!selectedChainId;
	}

	/** Whether the failure step should render */
	function shouldShowFailureStep(): boolean {
		return step === 'failure';
	}

	// ==========================================
	// Step Metadata
	// ==========================================

	/** Dialog title class — adds left padding when back button is visible to prevent overlap */
	function getDialogTitleClass(): string {
		const base = 'font-clash-display text-xl';
		return showBackButton() ? `${base} pl-7` : base;
	}

	/** Gets the dialog title for the current checkout step */
	function getStepTitle(): string {
		switch (step) {
			case 'select-chain':
				if (resolvedChainIds.length === 0) return 'Crypto Unavailable';
				return 'Select Network';
			case 'select-token':
				return 'Select Token';
			case 'connect-wallet':
				return 'Connect Wallet';
			case 'review':
				return 'Review & Pay';
			case 'confirming':
				return 'Confirming';
			case 'success':
				return 'Payment Complete';
			case 'failure':
				return 'Payment Failed';
		}
	}

	/**
	 * Whether the token selection step was shown (multi-token chain).
	 * Drives dynamic step count — when skipped, progress dots show 3 instead of 4.
	 */
	function wasTokenStepShown(): boolean {
		if (!selectedChainId) return false;
		return getTokensForChain(selectedChainId).length > 1;
	}

	/**
	 * Total navigable steps — 4 when token step is shown, 3 when auto-skipped
	 */
	function getTotalSteps(): number {
		return wasTokenStepShown()
			? TOTAL_STEPS_WITH_TOKEN
			: TOTAL_STEPS_WITHOUT_TOKEN;
	}

	/**
	 * Step progress indicator (1-indexed for display).
	 * Returns 0 for terminal steps (confirming, success, failure) — hides progress dots.
	 * When token step is skipped, connect-wallet becomes step 2 and review becomes step 3.
	 */
	function getStepNumber(): number {
		if (step === 'select-chain' && resolvedChainIds.length === 0) {
			return 0;
		}

		const tokenShown = wasTokenStepShown();
		switch (step) {
			case 'select-chain':
				return 1;
			case 'select-token':
				return 2;
			case 'connect-wallet':
				return tokenShown ? 3 : 2;
			case 'review':
				return tokenShown ? 4 : 3;
			default:
				return 0;
		}
	}

	/** Back button visible only on navigable steps (not first step or terminal states) */
	function showBackButton(): boolean {
		return getStepNumber() >= 2;
	}

	/**
	 * CSS class for step progress dot — active dots are wider and black
	 */
	function getStepDotClass(n: number): string {
		const base = 'h-1 rounded-full transition-all duration-300';
		return n <= getStepNumber()
			? `${base} w-6 bg-black`
			: `${base} w-1.5 bg-[#E5E5E5]`;
	}

	/** Returns 1-indexed step numbers for rendering progress dots */
	function getStepNumbers(): number[] {
		return Array.from({ length: getTotalSteps() }, (_, i) => i + 1);
	}

	/**
	 * Defensive empty-state for backend/frontend deploy skew.
	 *
	 * The CTA is already hidden when no selectable chain survives, but keep the modal
	 * resilient too so a stale client tree or forced-open state never traps the user
	 * in an empty selector with no recovery path.
	 */
	function renderUnavailableChainState(): React.ReactNode {
		return (
			<div className="flex flex-col items-center gap-5 py-6">
				<p className="text-center text-sm text-[#7B7B7B]">
					Crypto payments are temporarily unavailable for this raffle in the
					current app environment.
				</p>
				<Button
					onClick={handleClose}
					className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
				>
					Close
				</Button>
			</div>
		);
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-md overflow-hidden border border-[#0F0F0FF2] bg-white px-8 py-10">
				{/* Header with back button and step indicator */}
				<DialogHeader className="relative">
					{showBackButton() && (
						<button
							type="button"
							onClick={handleBack}
							className="absolute top-0.5 left-0 rounded-full p-1 text-[#7B7B7B] transition-colors hover:bg-gray-100 hover:text-black"
							aria-label="Go back"
						>
							<ArrowLeft className="size-4" />
						</button>
					)}
					<DialogTitle className={getDialogTitleClass()}>
						{getStepTitle()}
					</DialogTitle>

					{/* Step progress dots */}
					{getStepNumber() > 0 && (
						<div className="flex items-center justify-center gap-1.5 pt-1">
							{getStepNumbers().map(n => (
								<div key={n} className={getStepDotClass(n)} />
							))}
						</div>
					)}
				</DialogHeader>

				<div className="flex flex-col gap-4 pt-2">
					{step === 'select-chain' &&
						resolvedChainIds.length === 0 &&
						renderUnavailableChainState()}
					{step === 'select-chain' && resolvedChainIds.length > 0 && (
						<ChainSelector
							cryptoChainIds={resolvedChainIds}
							cryptoOptions={cryptoOptions}
							onSelectChain={handleSelectChain}
						/>
					)}
					{shouldShowTokenSelector() && (
						<TokenSelector
							tokens={getTokensForChain(selectedChainId!)}
							onSelectToken={handleSelectToken}
						/>
					)}
					{step === 'connect-wallet' && (
						<WalletStep
							address={address}
							isWalletVerified={isWalletVerified}
							isProcessing={isProcessing}
							nativeBalance={nativeBalance ?? undefined}
							onWalletReady={handleWalletReady}
						/>
					)}
					{shouldShowReviewStep() && (
						<ReviewStep
							session={session}
							raffleEndAt={raffleEndAt}
							selectedChainId={selectedChainId!}
							tokenSymbol={tokenSymbol}
							isCorrectChain={isCorrectChain}
							tokenBalance={tokenBalance ?? undefined}
							isTokenBalanceLoading={isTokenBalanceLoading}
							isTokenBalanceError={isBalanceError}
							isBalanceCheckPending={!tokenAddress || !balanceReadAddress}
							isProcessing={isProcessing}
							txSubmitted={txSubmitted}
							sessionBlockMessage={reviewSessionBlockMessage}
							chains={chains}
							onPay={handlePay}
						/>
					)}
					{shouldShowConfirmingStep() && (
						<ConfirmingStep
							txHash={txHash}
							selectedChainId={selectedChainId!}
							confirmations={observedConfirmationCount}
							confirmationTarget={confirmationTarget!}
							finalizationRequested={finalizationRequested}
							chains={chains}
						/>
					)}
					{shouldShowSuccessStep() && (
						<SuccessStep
							txHash={txHash}
							selectedChainId={selectedChainId!}
							chains={chains}
							onClose={handleClose}
						/>
					)}
					{shouldShowFailureStep() && (
						<FailureStep
							txHash={txHash}
							selectedChainId={selectedChainId ?? undefined}
							chains={chains}
							errorMessage={errorMessage}
							fundsAtRisk={fundsAtRisk}
							retryBlocked={retryBlocked}
							onClose={handleClose}
							onReset={handleReset}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
