'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi, getAddress } from 'viem';
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
	getPaySessionRevalidationDecision,
	getReviewSessionGuard,
	resolveCheckoutHydrationDecision,
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
import {
	getPaymentErrorMessage,
	getWalletErrorMessage,
} from '@/lib/checkout/error-messages';
import { getConfirmationTarget } from '@/lib/web3/block-explorers';
import {
	CRYPTO_TX_SUBMIT_OUTCOME,
	getCryptoSessionGraceDeadline,
	getCryptoSessionGraceWindowMs,
	getCryptoTxSubmitOutcome,
	normalizeTxHash,
	toBackendConfirmationCount,
	type CryptoConfirmingGracePhase,
} from '@/lib/web3/crypto-payment-flow';
import { SUPPORTED_WEB3_CHAIN_IDS } from '@/lib/web3/config';
import { isTransactionNotFound, isUserRejection } from '@/lib/web3/errors';
import {
	getTokenBySlugForChain,
	getSelectableTokensForChain,
	type TokenInfo,
} from '@/lib/web3/tokens';
import { cancelPaymentSession } from '@/services/payment/cancel-payment-session';
import { confirmCryptoTx } from '@/services/payment/confirm-crypto-tx';
import { createCryptoCheckout } from '@/services/payment/create-crypto-checkout';
import { getCryptoSession } from '@/services/payment/get-crypto-session';
import { submitCryptoTx } from '@/services/payment/submit-crypto-tx';
import { usePollCryptoSession } from '@/services/payment/use-poll-crypto-session';
import { usePollOrderStatus } from '@/services/payment/use-poll-order-status';
import { useWallets } from '@/services/wallet/use-wallets';
import { verifyWallet } from '@/services/wallet/verify-wallet';
import { PAYMENT_ERROR_CODES } from '@/types/errors';
import { ORDER_STATUS } from '@/types/order';
import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';
import type { CryptoTokenPricing } from '@/types/raffle';
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
	FALLBACK_FAILURE_MESSAGE;

// ==========================================
// Types
// ==========================================

interface CryptoCheckoutModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	raffleEndAt: string;
	cryptoChainIds: number[];
	/** Allowed token slugs from raffle — empty means all tokens allowed */
	cryptoTokens?: string[];
	/** Non-stablecoin pricing per token — needed for display in token selector */
	cryptoTokenPricing?: CryptoTokenPricing;
	userId?: string | null;
	onSuccess?: () => void;
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
	expiresAt: string;
	txHash: string | null;
	failureReason?: string | null;
}

/** Params for the shared server→local hydration mapper */
interface ApplyServerHydrationParams {
	serverSession: ServerSessionSnapshot;
	checkoutSession: CryptoCheckoutSession;
	checksummedAddress: string;
	fallbackToken: TokenInfo;
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
 * 4. Review & Send — cancel existing session, create checkout, execute ERC20 transfer, submit tx hash
 * 5. Confirming — poll order status until backend confirms
 * 6. Success/Failure — terminal state with tx explorer link
 *
 * Cross-method guard: cancels any active Stripe/crypto session before creating
 * a new crypto session, preventing "stripe-session-active" / "crypto-session-active" errors.
 */
export function CryptoCheckoutModal({
	open,
	onOpenChange,
	orderId,
	raffleEndAt,
	cryptoChainIds,
	cryptoTokens = [],
	cryptoTokenPricing = [],
	userId,
	onSuccess,
	onConfirmingChange,
}: CryptoCheckoutModalProps) {
	const [step, setStep] = useState<CheckoutStep>('select-chain');
	const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
	const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
	const [session, setSession] = useState<CryptoCheckoutSession | null>(null);
	// Tracks which token slug was used to create the current session — needed
	// to detect token changes when user navigates back and picks a different token.
	// Can't compare via session.tokenAddress because frontend doesn't have slug→address mapping.
	const [sessionTokenSlug, setSessionTokenSlug] = useState<string | null>(null);
	// Backend binds each session to the verified sender wallet (`fromAddress`).
	// Track the address used at session creation time so back-navigation cannot
	// silently reuse wallet A's session after the user reconnects wallet B.
	const [sessionWalletAddress, setSessionWalletAddress] = useState<
		string | null
	>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// Tracks whether a reorg with ambiguous balance was detected — funds may have
	// left the wallet but the tx vanished. When true, "Try Again" is hidden to
	// prevent duplicate payments. Passed as explicit prop to FailureStep.
	const [fundsAtRisk, setFundsAtRisk] = useState(false);

	// Wagmi hooks
	const { address, chainId: connectedChainId } = useAccount();
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
	// FE mirror of the backend's two post-expiry windows:
	// - submit: backend has not durably accepted a tx hash yet
	// - confirming: backend already owns a hash / session is confirming
	// This is state (not just a ref) because timers and poll budgets must re-arm
	// when the session upgrades from "submit grace" to "confirming grace".
	const [confirmingGracePhase, setConfirmingGracePhase] =
		useState<CryptoConfirmingGracePhase>('submit');

	// Guards the success transition — prevents double onSuccess() when both
	// FE-driven confirm and polling detect COMPLETED in the same render cycle.
	// Set synchronously before async state update to close the race window.
	const successTransitioned = useRef(false);

	// Guards reorg detection — prevents concurrent handlePossibleReorg executions
	// when txFailureCount increments multiple times while balance refetch is pending.
	const reorgHandled = useRef(false);

	// Ref for latest polledSession — avoids adding polledSession to useEffect deps
	// (which would cause re-runs every 5s). Read from ref inside effects to get
	// the most recent failureReason without coupling to the poll cycle.
	const polledSessionRef =
		useRef<Awaited<ReturnType<typeof usePollCryptoSession>>['data']>(undefined);

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

		if (confirmingGracePhase === 'confirming' || !!txHash) {
			setErrorMessage(
				'Payment verification timed out. Your transaction may still be processing — please check your order history or contact support.',
			);
		} else {
			setErrorMessage('Checkout session expired. Please try again.');
		}

		setStep('failure');
	}, [confirmingGracePhase, txHash]);

	/**
	 * Minimal fallback token when backend returns a stored session for a token the
	 * current FE selection no longer represents.
	 *
	 * Why this fallback exists:
	 * - backend checkout recovery is authoritative and may return stored session values
	 * - the modal still needs a stable label/slug even if FE's latest selection differs
	 * - TokenInfo only drives display + local comparisons; on-chain execution uses the
	 *   session's tokenAddress/amount from backend, not this fallback object
	 */
	const buildRecoveredToken = useCallback(
		(
			currency: string,
			chainId: number,
			fallbackToken: TokenInfo,
		): TokenInfo => {
			const recoveredSlug = currency.toLowerCase();

			return (
				getTokenBySlugForChain(chainId, recoveredSlug) ??
				(fallbackToken.slug === recoveredSlug
					? fallbackToken
					: {
							slug: recoveredSlug,
							label: currency,
							// Fallback heuristic — only reached when token is absent from
							// TOKENS_BY_CHAIN (e.g. newly added backend token not yet in FE
							// registry). If a new stablecoin is added, update TOKENS_BY_CHAIN first.
							isStablecoin:
								recoveredSlug === 'usdc' || recoveredSlug === 'usdt',
						})
			);
		},
		[],
	);

	/**
	 * Idempotent success transition — guards against double onSuccess() when
	 * FE-driven confirm and polling detect COMPLETED in the same render cycle.
	 */
	const transitionToSuccess = useCallback(() => {
		if (successTransitioned.current) return;
		successTransitioned.current = true;
		setStep('success');
		onSuccess?.();
	}, [onSuccess]);

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
				expiresAt: serverSession.expiresAt,
			};
			const recoveredTxHash = serverSession.txHash as `0x${string}` | null;

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
				confirmingGracePhase:
					nextStep === 'confirming' || !!recoveredTxHash
						? 'confirming'
						: 'submit',
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
			confirmingGracePhase: nextConfirmingGracePhase,
			backendTrackedHash = null,
			backendOwnsTx = false,
			fundsAtRisk: nextFundsAtRisk = false,
			retryBlocked: nextRetryBlocked = false,
			errorMessage: nextErrorMessage = null,
		}: {
			txHash: `0x${string}` | undefined;
			txSubmitted: boolean;
			submitRecoveryMode?: SubmitRecoveryMode;
			finalizationRequested?: boolean;
			confirmingGracePhase: CryptoConfirmingGracePhase;
			backendTrackedHash?: string | null;
			backendOwnsTx?: boolean;
			fundsAtRisk?: boolean;
			retryBlocked?: boolean;
			errorMessage?: string | null;
		}) => {
			setTxHash(nextTxHash);
			setTxSubmitted(nextTxSubmitted);
			setSubmitRecoveryMode(nextSubmitRecoveryMode);
			setFinalizationRequested(nextFinalizationRequested);
			setConfirmingGracePhase(nextConfirmingGracePhase);
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
			checksummedAddress: string;
			token: TokenInfo;
		}) => {
			setSelectedChainId(checkoutSession.chainId);
			setSelectedToken(token);
			setSession(checkoutSession);
			setSessionTokenSlug(token.slug);
			setSessionWalletAddress(checksummedAddress);
		},
		[],
	);

	/**
	 * Clears any session that was bound to an older wallet or expired review state.
	 *
	 * Chain/token selection stay intact so the user only needs to re-run the wallet
	 * step; forcing them back through chain selection would add friction without
	 * improving correctness.
	 */
	const clearSessionBoundCheckout = useCallback(() => {
		setSession(null);
		setSessionTokenSlug(null);
		setSessionWalletAddress(null);
		payInFlight.current = false;
		setIsProcessing(false);
		applyCheckoutRuntimeState({
			txHash: undefined,
			txSubmitted: false,
			confirmingGracePhase: 'submit',
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
	 * - if we just created a fresh session and the read fails, we can still fall back
	 *   to review because cancel succeeded and there is no older confirming session to recover
	 */
	const hydrateCheckoutSession = useCallback(
		async ({
			allowReviewFallback,
			checkoutSession,
			checksummedAddress,
			fallbackToken,
			flowVersion,
		}: {
			allowReviewFallback: boolean;
			checkoutSession: CryptoCheckoutSession;
			checksummedAddress: string;
			fallbackToken: TokenInfo;
			flowVersion: number;
		}) => {
			const sessionResult = await getCryptoSession(checkoutSession.id);
			if (!isPreConfirmingFlowCurrent(flowVersion)) return false;

			const hydrationDecision = resolveCheckoutHydrationDecision({
				allowReviewFallback,
				serverStatus: sessionResult.success
					? sessionResult.data.status
					: undefined,
				sessionReadSucceeded: sessionResult.success,
			});

			if (hydrationDecision.kind === 'review-fallback') {
				// Fresh session fallback: cancel already succeeded, so we know backend is
				// not holding an older confirming session. Review can safely continue on
				// the newly-created checkout payload even if the follow-up read hiccups.
				applyCheckoutSessionState({
					checkoutSession,
					checksummedAddress,
					token: fallbackToken,
				});
				applyCheckoutRuntimeState({
					txHash: undefined,
					txSubmitted: false,
					confirmingGracePhase: 'submit',
				});
				setStep('review');
				return true;
			}

			if (hydrationDecision.kind === 'confirming-recovery') {
				// `cancel:crypto-confirming` already told us backend owns an in-flight
				// payment. If the session read transiently fails, stay in confirming and
				// let polling recover the authoritative truth instead of false-failing.
				applyCheckoutSessionState({
					checkoutSession,
					checksummedAddress,
					token: fallbackToken,
				});
				applyCheckoutRuntimeState({
					txHash: undefined,
					txSubmitted: true,
					confirmingGracePhase: 'confirming',
					backendOwnsTx: true,
				});
				setStep('confirming');
				return true;
			}

			// TypeScript cannot infer from the decision helper that only successful reads
			// reach this branch. Narrow explicitly before consuming the authoritative payload.
			if (!sessionResult.success) return false;

			const outcome = applyServerHydration({
				serverSession: sessionResult.data,
				checkoutSession,
				checksummedAddress,
				fallbackToken,
				nextStep: hydrationDecision.nextStep,
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
					setConfirmingGracePhase('confirming');
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
				// `poll` means backend already owns authoritative session state.
				// Upgrade to the longer confirming grace window immediately instead
				// of waiting for the next session poll tick to catch up.
				if (outcome === CRYPTO_TX_SUBMIT_OUTCOME.POLL) {
					setConfirmingGracePhase('confirming');
				}
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
	const confirmationTarget = selectedChainId
		? getConfirmationTarget(selectedChainId)
		: null;

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
	const backendConfirmationCount =
		toBackendConfirmationCount(confirmationCount);

	useWaitForTransactionReceipt({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		// 1 — fires onReplaced on first block inclusion. Using confirmationTarget
		// here would delay replacement detection on high-finality chains (e.g.
		// Ethereum 12 blocks). Actual finalization is tracked via confirmationTarget.
		confirmations: 1,
		pollingInterval: 4_000,
		onReplaced(replacement) {
			lastReplacementReason.current = replacement.reason;

			// If the wallet cancelled before backend accepted any hash, unwind cleanly
			// back to review — no payment tx remains to reconcile.
			if (
				replacement.reason === 'cancelled' &&
				!backendTrackedTxHash.current &&
				!txSubmittedToBackend.current
			) {
				setTxHash(undefined);
				setTxSubmitted(false);
				setSubmitRecoveryMode(null);
				setFinalizationRequested(false);
				setRetryBlocked(false);
				setFundsAtRisk(false);
				setErrorMessage(null);
				payInFlight.current = false;
				txConfirmRequested.current = false;
				txConfirmInFlight.current = false;
				reorgHandled.current = false;
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
		},
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
	const tokenQueryEnabled = !!tokenAddress && !!address;

	// ---- Balance recheck for reorg recovery ----
	// Separate balance read that's only enabled during confirming to detect if funds
	// were actually deducted after a suspected reorg. Shares the same wagmi cache entry
	// as the review-step balance read (same contract params = same query key).
	// This is harmless — both want fresh balance data and refetch updates both.
	const { refetch: refetchConfirmingBalance } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: address ? [address] : undefined,
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
		args: address ? [address] : undefined,
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
	const isTokenBalanceError = isBalanceError;

	// Shape token data to match the interface ReviewStep expects
	const tokenBalance = useMemo(() => {
		if (rawBalance === undefined || rawDecimals === undefined) return undefined;
		return {
			value: rawBalance as bigint,
			decimals: rawDecimals as number,
			symbol: (rawSymbol as string) ?? 'USDC',
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
	const confirmingPollWindowMs = useMemo(
		() =>
			step === 'confirming' && session?.expiresAt
				? getCryptoSessionGraceWindowMs(session.expiresAt, confirmingGracePhase)
				: undefined,
		[step, session?.expiresAt, confirmingGracePhase],
	);
	// Avoid polling the backend while the wallet signature/send prompt is still open.
	// We start polling once there is a tx hash, a submit recovery path, or we know
	// backend already owns the session as a confirming payment.
	const shouldPollConfirmingState =
		step === 'confirming' &&
		(!!txHash ||
			submitRecoveryMode !== null ||
			confirmingGracePhase === 'confirming');
	const { data: polledOrder, isExpired: isPollingExpired } = usePollOrderStatus(
		shouldPollConfirmingState ? orderId : null,
		confirmingPollWindowMs,
	);

	// Poll crypto session endpoint for authoritative session state + failureReason.
	// The order endpoint only has status; the session endpoint exposes the
	// backend's actual failure reason (e.g. "Transaction reverted", "Amount mismatch").
	const { data: polledSession } = usePollCryptoSession(
		shouldPollConfirmingState && session ? session.id : null,
		confirmingPollWindowMs,
	);
	// Sync ref each render — effects read from ref to avoid dep on poll cycle
	polledSessionRef.current = polledSession;

	// Non-stablecoins are only actually purchasable when the raffle prices them.
	// Hoist token IDs once so chain resolution and selectors share the same filter.
	const pricedTokenSlugs = useMemo(
		() => cryptoTokenPricing.map(entry => entry.tokenId),
		[cryptoTokenPricing],
	);

	/**
	 * Gets tokens the current raffle can actually sell on a chain.
	 * Shared by chain resolution, token selection, and chain-label display.
	 */
	const getAllowedTokens = useCallback(
		(chainId: number): TokenInfo[] =>
			getSelectableTokensForChain(chainId, {
				allowedTokenSlugs: cryptoTokens,
				pricedTokenSlugs,
			}),
		[cryptoTokens, pricedTokenSlugs],
	);

	// ==========================================
	// Derived State
	// ==========================================

	/**
	 * Resolved chain IDs — empty from API means "all chains allowed",
	 * so fall back to every chain in the token registry.
	 * Chains with zero allowed tokens are filtered out to prevent
	 * selecting a chain that has no valid payment option.
	 */
	const resolvedChainIds = useMemo(() => {
		// Backend may allow "all chains", but FE must only surface chains the
		// current wagmi config can actually switch to in this environment.
		const supportedChainIds = new Set<number>(SUPPORTED_WEB3_CHAIN_IDS);
		const baseChains =
			cryptoChainIds.length > 0 ? cryptoChainIds : SUPPORTED_WEB3_CHAIN_IDS;

		return baseChains.filter(chainId => {
			if (!supportedChainIds.has(chainId)) return false;
			return getAllowedTokens(chainId).length > 0;
		});
	}, [cryptoChainIds, getAllowedTokens]);

	/**
	 * Canonical connected wallet address used across verification and session guards.
	 *
	 * wagmi can expose lowercase addresses depending on connector state; normalizing
	 * once here keeps wallet-binding checks and server payloads consistent.
	 */
	const checksummedAddress = useMemo(
		() => (address ? getAddress(address) : null),
		[address],
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
	const tokenSymbol = selectedToken?.label ?? 'USDC';

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
			expiresAt: session?.expiresAt,
		});

		switch (reviewGuard.kind) {
			case 'wallet-changed':
				return 'Wallet changed. Continue again to bind the current wallet.';
			case 'session-expired':
				return 'Checkout session expired. Continue again to refresh it.';
			default:
				return null;
		}
	}, [checksummedAddress, session?.expiresAt, sessionWalletAddress]);

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
	 * Session polling is authoritative for whether backend has accepted a hash.
	 *
	 * This closes the "response lost after commit" gap:
	 * - submit POST may succeed server-side but fail client-side on the way back
	 * - polling the session gives FE the same truth without trusting the submit response
	 */
	useEffect(() => {
		if (step !== 'confirming' || !polledSession?.txHash) return;

		// Skip no-op updates — polling fires every 5s but these values only
		// need to be set once when backend first reports the tx hash.
		if (txSubmittedToBackend.current && confirmingGracePhase === 'confirming')
			return;

		backendTrackedTxHash.current = normalizeTxHash(polledSession.txHash);
		txSubmittedToBackend.current = true;
		setSubmitRecoveryMode(null);
		setConfirmingGracePhase('confirming');
	}, [step, polledSession?.txHash, confirmingGracePhase]);

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
		if (!session || txSubmittedToBackend.current || polledSession?.txHash)
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
		polledSession?.txHash,
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
	}, [step, txHash, failBackendTrackedReplacement]);

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

		if (backendConfirmationCount < confirmationTarget) return;
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
					confirmations: backendConfirmationCount,
				});

				if (!result.success) {
					// Non-fatal — polling/cron will finalize eventually.
					// Leave retry open for the next confirmation/poll tick instead of
					// permanently downgrading this tx to cron-only after one transient error.
					console.warn(
						'FE-driven confirm failed, falling back to cron:',
						result.error,
					);
					return;
				}

				txConfirmRequested.current = true;
				setFinalizationRequested(true);

				// Backend confirmed — session status 'completed' means tickets created.
				// successTransitioned ref prevents double onSuccess() when polling
				// also detects COMPLETED in the same render cycle.
				if (result.data.status === CRYPTO_PAYMENT_STATUS.COMPLETED) {
					transitionToSuccess();
				}
				// Any other status: cron/polling will handle the final transition
			} finally {
				txConfirmInFlight.current = false;
			}
		}

		requestConfirmation();
	}, [
		step,
		txHash,
		session,
		selectedChainId,
		confirmationTarget,
		backendConfirmationCount,
		onSuccess,
	]);

	/**
	 * Transition to success/failure when polling detects terminal state.
	 * Uses both order polling (authoritative for order status) and session polling
	 * (provides failureReason for user-facing error messages).
	 */
	useEffect(() => {
		if (!polledOrder || step !== 'confirming') return;

		if (polledOrder.status === ORDER_STATUS.COMPLETED) {
			transitionToSuccess();
		} else if (
			polledOrder.status === ORDER_STATUS.FAILED ||
			polledOrder.status === ORDER_STATUS.REFUNDED
		) {
			// Use failureReason from session ref if available — it contains
			// actionable info (e.g. "Transaction reverted", "Amount mismatch")
			// that the order endpoint does not expose. Read from ref to avoid
			// coupling this effect to the session poll cycle.
			const reason =
				polledSessionRef.current?.failureReason ??
				FALLBACK_FAILURE_MESSAGE;
			setErrorMessage(reason);
			setStep('failure');
		}
	}, [polledOrder, step, onSuccess]);

	/**
	 * Polling timeout — transitions to failure when polling exceeds max duration.
	 * Safety net for cases where backend never moves order to terminal status
	 * (e.g. tx validation stuck, session expired without cleanup).
	 */
	useEffect(() => {
		if (!isPollingExpired || step !== 'confirming') return;
		failConfirmingWindowExpired();
	}, [failConfirmingWindowExpired, isPollingExpired, step]);

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

		handlePossibleReorg();
	}, [
		step,
		txHash,
		txError,
		txFailureCount,
		session,
		refetchConfirmingBalance,
	]);

	/**
	 * Session expiry timer — aligned to backend PR 40 grace windows.
	 *
	 * Why this is not tied to raw expiresAt:
	 * - backend accepts late submit attempts for 10 minutes after expiry
	 * - once backend owns a tx hash, it keeps verifying for 15 minutes after expiry
	 * - failing the FE at raw TTL creates false terminal failures for real in-flight payments
	 */
	useEffect(() => {
		if (step !== 'confirming' || !session?.expiresAt) return;

		const msUntilExpiry =
			getCryptoSessionGraceDeadline(session.expiresAt, confirmingGracePhase) -
			Date.now();

		// Already beyond the backend grace window — transition immediately
		if (msUntilExpiry <= 0) {
			failConfirmingWindowExpired();
			return;
		}

		const timer = setTimeout(failConfirmingWindowExpired, msUntilExpiry);
		return () => clearTimeout(timer);
	}, [
		confirmingGracePhase,
		failConfirmingWindowExpired,
		session?.expiresAt,
		step,
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

		const tokens = getAllowedTokens(chainId);

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
	function handleSelectToken(token: TokenInfo) {
		setSelectedToken(token);
		setStep('connect-wallet');
	}

	/**
	 * Step 2: After wallet is connected, verify if needed then create/recover checkout session.
	 *
	 * Cross-method guard still starts with cancel, but `cancel:crypto-confirming`
	 * is a recovery signal now, not a hard failure:
	 * - Stripe/pending sessions should still be cancelled before we continue
	 * - confirming crypto sessions cannot be cancelled, so we immediately re-run
	 *   idempotent checkout creation and hydrate from the stored backend session
	 *
	 * EIP-191 signature message format must match backend exactly:
	 * "Link wallet {checksummedAddress} to Raffles account {userId} at {isoTimestamp}"
	 */
	const handleWalletReady = useCallback(async () => {
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
			const existingSessionValid =
				session &&
				session.chainId === selectedChainId &&
				sessionTokenSlug === selectedToken.slug &&
				getReviewSessionGuard({
					connectedAddress: checksummedAddress,
					sessionWalletAddress,
					expiresAt: session.expiresAt,
				}).kind === 'ready';

			if (existingSessionValid) {
				await hydrateCheckoutSession({
					allowReviewFallback: true,
					checkoutSession: session,
					checksummedAddress,
					fallbackToken: selectedToken,
					flowVersion,
				});
				return;
			}

			// Cancel-first remains the safe default because it clears Stripe sessions and
			// stale pending crypto sessions. The one exception is `crypto-confirming`:
			// backend already owns an in-flight payment there, so the FE must recover it
			// instead of forcing a false terminal failure.
			const cancelResult = await cancelPaymentSession(orderId);
			if (!isPreConfirmingFlowCurrent(flowVersion)) return;
			const recoveringConfirmingSession =
				!cancelResult.success &&
				cancelResult.error === PAYMENT_ERROR_CODES.CANCEL_CRYPTO_CONFIRMING;

			if (!cancelResult.success && !recoveringConfirmingSession) {
				// Cancel is the method-switch guard. If it fails, we no longer know
				// whether the opposite payment method is still active, so do not proceed.
				setErrorMessage(getPaymentErrorMessage(cancelResult.error));
				setStep('failure');
				return;
			}

			// Create checkout session so Review step shows the amount
			const checkoutResult = await createCryptoCheckout({
				orderId,
				chainId: selectedChainId,
				walletAddress: checksummedAddress,
				token: selectedToken.slug,
			});
			if (!isPreConfirmingFlowCurrent(flowVersion)) return;

			if (!checkoutResult.success) {
				setErrorMessage(getPaymentErrorMessage(checkoutResult.error));
				setStep('failure');
				return;
			}

			await hydrateCheckoutSession({
				allowReviewFallback: !recoveringConfirmingSession,
				checkoutSession: checkoutResult.data,
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
			if (!isPreConfirmingFlowCurrent(flowVersion)) return;
			walletReadyInFlight.current = false;
			setIsProcessing(false);
		}
	}, [
		checksummedAddress,
		clearCloseResetTimeout,
		isPreConfirmingFlowCurrent,
		selectedChainId,
		selectedToken,
		isWalletVerified,
		userId,
		signMessageAsync,
		refetchWallets,
		orderId,
		session,
		sessionTokenSlug,
		sessionWalletAddress,
		hydrateCheckoutSession,
	]);

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
				expiresAt: session.expiresAt,
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
				expiresAt: serverSession.expiresAt,
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

			// Keep local session expiry aligned with the server we just revalidated.
			setSession({
				...session,
				expiresAt: serverSession.expiresAt,
			});

			// Switch chain if wallet is on a different network
			if (!isCorrectChain) {
				await switchChainAsync({ chainId: selectedChainId });
			}

			// Move to confirming before awaiting wallet broadcast.
			// This keeps the UI in the pending state the moment the user approves,
			// and avoids a stale "review" screen while wagmi starts producing tx data.
			// Start on submit grace — we only switch to confirming grace once backend
			// actually owns the tx hash or session polling proves it does.
			setTxSubmitted(true);
			setConfirmingGracePhase('submit');
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
				setConfirmingGracePhase('submit');
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
		invalidatePreConfirmingFlow();
		setStep('select-chain');
		setSelectedChainId(null);
		setSelectedToken(null);
		setSession(null);
		setSessionTokenSlug(null);
		setSessionWalletAddress(null);
		setIsProcessing(false);
		setErrorMessage(null);
		setFundsAtRisk(false);
		setRetryBlocked(false);
		setTxSubmitted(false);
		setTxHash(undefined);
		setSubmitRecoveryMode(null);
		setFinalizationRequested(false);
		setConfirmingGracePhase('submit');
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

		// Any pre-confirming bootstrap work belongs to the now-closing modal instance.
		// Invalidate it immediately so late async completions cannot repopulate hidden state.
		invalidatePreConfirmingFlow();
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
				if (selectedChainId && getAllowedTokens(selectedChainId).length > 1) {
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
			step === 'confirming' &&
			!!selectedChainId &&
			confirmationTarget !== null
		);
	}

	/** Whether the success step should render — requires chain selection */
	function shouldShowSuccessStep(): boolean {
		return step === 'success' && !!selectedChainId;
	}

	// ==========================================
	// Step Metadata
	// ==========================================

	/**
	 * Gets the dialog title for current step
	 */
	function getStepTitle(): string {
		switch (step) {
			case 'select-chain':
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
		return getAllowedTokens(selectedChainId).length > 1;
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
					<DialogTitle
						className={`font-clash-display text-xl ${showBackButton() ? 'pl-7' : ''}`}
					>
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
					{step === 'select-chain' && (
						<ChainSelector
							cryptoChainIds={resolvedChainIds}
							cryptoTokens={cryptoTokens}
							pricedTokenSlugs={pricedTokenSlugs}
							onSelectChain={handleSelectChain}
						/>
					)}
					{shouldShowTokenSelector() && (
						<TokenSelector
							tokens={getAllowedTokens(selectedChainId!)}
							cryptoTokenPricing={cryptoTokenPricing}
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
							isTokenBalanceError={isTokenBalanceError}
							isBalanceCheckPending={!tokenAddress || !address}
							isProcessing={isProcessing}
							txSubmitted={txSubmitted}
							sessionBlockMessage={reviewSessionBlockMessage}
							onPay={handlePay}
						/>
					)}
					{shouldShowConfirmingStep() && (
						<ConfirmingStep
							txHash={txHash}
							selectedChainId={selectedChainId!}
							confirmations={backendConfirmationCount}
							confirmationTarget={confirmationTarget!}
							finalizationRequested={finalizationRequested}
						/>
					)}
					{shouldShowSuccessStep() && (
						<SuccessStep
							txHash={txHash}
							selectedChainId={selectedChainId!}
							onClose={handleClose}
						/>
					)}
					{step === 'failure' && (
						<FailureStep
							txHash={txHash}
							selectedChainId={selectedChainId ?? undefined}
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
