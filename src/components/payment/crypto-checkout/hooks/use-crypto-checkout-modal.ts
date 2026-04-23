'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAddressEqual, type Address } from 'viem';
import {
	useSendTransaction,
	useSignMessage,
	useSwitchChain,
	useWaitForTransactionReceipt,
} from 'wagmi';

import { getReviewSessionGuard } from '@/components/payment/crypto-checkout/session/session-guards';
import { dispatchReplacementWithStepGuard } from '@/components/payment/crypto-checkout/guards/replacement-step-guard';
import {
	failBackendTrackedReplacement as buildFailBackendTrackedReplacement,
	failConfirmingWindowExpired as buildFailConfirmingWindowExpired,
	failSubmittedTxRegistration as buildFailSubmittedTxRegistration,
} from '@/components/payment/crypto-checkout/recovery/terminal-failures';
import type { CheckoutStep } from '@/components/payment/crypto-checkout/steps/step-progress';
import { useCheckoutFlowGuards } from '@/components/payment/crypto-checkout/hooks/use-flow-guards';
import { useCheckoutActions } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions';
import { useCheckoutSession } from '@/components/payment/crypto-checkout/session/use-checkout-session';
import { useCheckoutTerminalSync } from '@/components/payment/crypto-checkout/hooks/use-checkout-terminal-sync';
import { useCheckoutWagmiReads } from '@/components/payment/crypto-checkout/hooks/use-checkout-wagmi-reads';
import { useFeConfirmation } from '@/components/payment/crypto-checkout/hooks/use-fe-confirmation';
import {
	useTxTracking,
	type ApplyRuntimeStateParams,
} from '@/components/payment/crypto-checkout/hooks/use-tx-tracking';
import { getCryptoSessionGraceWindowMs } from '@/lib/web3/payment/crypto-payment-flow';
import { SUPPORTED_WEB3_CHAIN_IDS } from '@/lib/web3/config/constants';
import { getSelectableCryptoChains } from '@/lib/web3/payment/raffle-crypto-options';
import { abandonOrder } from '@/services/payment/abandon-order';
import { useConfirmCryptoTx } from '@/services/payment/use-confirm-crypto-tx';
import { useCryptoConfig } from '@/services/payment/use-crypto-config';
import { usePollCheckoutStatus } from '@/services/payment/use-poll-checkout-status';
import { useWallets } from '@/services/wallet/use-wallets';
import type { RaffleCryptoOptions } from '@/types/raffle';

// ==========================================
// Types
// ==========================================

export interface UseCryptoCheckoutModalParams {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	raffleId: string;
	ticketQuantity: number;
	promoCode?: string;
	onPromoInvalid?: () => void;
	cryptoOptions: RaffleCryptoOptions;
	userId?: string | null;
	onSuccess?: (confirmedQuantity: number) => void;
	onConfirmingChange?: (isConfirming: boolean) => void;
}

// ==========================================
// Main orchestrator hook
// ==========================================

/**
 * Wires every sub-hook the crypto checkout modal needs and returns a flat
 * bag the parent component renders from.
 *
 * Breaking this into a dedicated hook keeps `CryptoCheckoutModal` under
 * the 150-LOC / complexity-20 caps — the component is now just the shell
 * plus the JSX frame.
 *
 * @param p - Modal props
 * @returns Everything the JSX needs: state, hook handles, handlers, deriveds
 */
export function useCryptoCheckoutModal(p: UseCryptoCheckoutModalParams) {
	const core = useCoreCheckoutHooks(p);
	useConfirmingStepNotifier(core.ui.step, p.onConfirmingChange);
	useCheckoutWiringEffects(core);
	useReceiptAndRecoveryEffect(core);
	const handlers = useCheckoutActions({
		step: core.ui.step,
		goToStep: core.ui.goToStep,
		cryptoOptions: p.cryptoOptions,
		session: core.session,
		tx: core.tx,
		fe: core.fe,
		guards: core.guards,
		raffleId: p.raffleId,
		ticketQuantity: p.ticketQuantity,
		promoCode: p.promoCode,
		onPromoInvalid: p.onPromoInvalid,
		onSuccess: p.onSuccess,
		onOpenChange: p.onOpenChange,
		userId: p.userId,
		connectedChecksummed: core.wagmi.connectedChecksummed,
		liveAddressRef: core.liveAddressRef,
		liveChainIdRef: core.liveChainIdRef,
		isWalletVerified: core.isWalletVerified,
		isCorrectChain:
			core.session.selectedChainId === core.wagmi.connectedChainId,
		signMessageAsync: core.wagmiWrite.signMessageAsync,
		switchChainAsync: core.wagmiWrite.switchChainAsync,
		sendTransactionAsync: core.wagmiWrite.sendTransactionAsync,
		resetSendTransaction: core.wagmiWrite.resetSendTransaction,
		refetchWallets: core.walletsInfo.refetch,
		setIsProcessing: core.ui.setIsProcessing,
		setErrorMessage: core.ui.setErrorMessage,
		setFundsAtRisk: core.ui.setFundsAtRisk,
		failSubmittedTxRegistration: core.terminal.failSubmittedTxRegistration,
		abandonOrder,
		fundsAtRisk: core.ui.fundsAtRisk,
		retryBlocked: core.tx.retryBlocked,
	});
	const cryptoConfig = useCryptoConfig();
	return {
		ui: core.ui,
		session: core.session,
		tx: core.tx,
		fe: core.fe,
		wagmi: core.wagmi,
		handlers,
		resolvedChainIds: core.resolvedChainIds,
		reviewSessionBlockMessage: core.reviewSessionBlockMessage,
		isWalletVerified: core.isWalletVerified,
		chains: cryptoConfig.data?.chains ?? [],
	};
}

// ==========================================
// Core composition hook — owns every state/ref + the sub-hook wiring
// ==========================================

type CoreCheckoutHooks = ReturnType<typeof useCoreCheckoutHooks>;

function useCoreCheckoutHooks(p: UseCryptoCheckoutModalParams) {
	const base = useBaseCheckoutState(p);
	const derived = useDerivedCheckoutState(p, base);
	return { p, ...base, ...derived };
}

interface BaseCheckoutState {
	ui: ReturnType<typeof useModalUiState>;
	wagmiWrite: ReturnType<typeof useModalWagmiWrite>;
	guards: ReturnType<typeof useCheckoutFlowGuards>;
	session: ReturnType<typeof useCheckoutSession>;
	tx: ReturnType<typeof useTxTracking>;
	wagmi: ReturnType<typeof useCheckoutWagmiReads>;
	txApplyRuntimeStateRef: { current: (par: ApplyRuntimeStateParams) => void };
	feTransitionToSuccessRef: { current: () => void };
	feResetConfirmationRef: { current: () => void };
	sessionConfirmedQuantityRef: { current: { current: number } };
	liveAddressRef: { current: Address | null };
	liveChainIdRef: { current: number | undefined };
}

/**
 * First pass: UI state, cross-hook ref holders, guards, and the three
 * state hooks (`session`, `tx`, `wagmi`). Kept separate from
 * `useDerivedCheckoutState` so neither sub-hook exceeds 60 lines.
 */
function useBaseCheckoutState(
	p: UseCryptoCheckoutModalParams,
): BaseCheckoutState {
	const ui = useModalUiState();
	// Cross-hook ref holders — fallbacks are inert no-ops so an accidental
	// early call surfaces as "nothing happened" instead of a runtime crash.
	const txApplyRuntimeStateRef = useRef<(par: ApplyRuntimeStateParams) => void>(
		() => undefined,
	);
	const feTransitionToSuccessRef = useRef<() => void>(() => undefined);
	const feResetConfirmationRef = useRef<() => void>(() => undefined);
	const sessionConfirmedQuantityRef = useRef<{ current: number }>({
		current: p.ticketQuantity,
	});
	const wagmiWrite = useModalWagmiWrite();
	const guards = useCheckoutFlowGuards();
	const session = useCheckoutSession({
		cryptoOptions: p.cryptoOptions,
		ticketQuantity: p.ticketQuantity,
		applyRuntimeState: par => txApplyRuntimeStateRef.current(par),
		goToStep: ui.goToStep,
		transitionToSuccess: () => feTransitionToSuccessRef.current(),
		isPreConfirmingFlowCurrent: v => guards.getCurrentFlowVersion() === v,
		releasePayInFlight: () => guards.releaseInFlightGuards(),
		setIsProcessing: ui.setIsProcessing,
	});
	const tx = useTxTracking({
		session: session.session,
		resetSendTransaction: wagmiWrite.resetSendTransaction,
		resetFeConfirmation: () => feResetConfirmationRef.current(),
		setErrorMessage: ui.setErrorMessage,
		setFundsAtRisk: ui.setFundsAtRisk,
		goToStep: ui.goToStep,
	});
	const wagmi = useCheckoutWagmiReads({
		step: ui.step,
		selectedChainId: session.selectedChainId,
		sessionWalletAddress: session.sessionWalletAddress,
		tokenAddress: session.session?.tokenAddress as `0x${string}` | undefined,
		txHash: tx.txHash,
	});
	const liveAddressRef = useRef<Address | null>(wagmi.connectedChecksummed);
	const liveChainIdRef = useRef<number | undefined>(wagmi.connectedChainId);
	return {
		ui,
		wagmiWrite,
		guards,
		session,
		tx,
		wagmi,
		txApplyRuntimeStateRef,
		feTransitionToSuccessRef,
		feResetConfirmationRef,
		sessionConfirmedQuantityRef,
		liveAddressRef,
		liveChainIdRef,
	};
}

/**
 * Second pass: `fe`, terminal handlers, wallet-verification, polling,
 * selectable-chain derivations, and the review guard.
 */
function useDerivedCheckoutState(
	p: UseCryptoCheckoutModalParams,
	base: BaseCheckoutState,
) {
	const fe = useFeConfirmationFromBase(p, base);
	const terminal = useTerminalFailureHandlers({
		tx: base.tx,
		fe,
		goToStep: base.ui.goToStep,
		setFundsAtRisk: base.ui.setFundsAtRisk,
		setErrorMessage: base.ui.setErrorMessage,
	});
	const walletsInfo = useWallets({
		// Guard on userId — without auth, getWallets returns 401 silently.
		enabled: p.open && !!p.userId,
	});
	const isWalletVerified = useMemo(() => {
		if (!base.wagmi.address || !walletsInfo.data?.wallets) return false;
		return walletsInfo.data.wallets.some(w =>
			isAddressEqual(w.address, base.wagmi.address as Address),
		);
	}, [base.wagmi.address, walletsInfo.data]);
	const polling = usePollingAndDeadlines({
		step: base.ui.step,
		txHash: base.tx.txHash,
		submitRecoveryMode: base.tx.submitRecoveryMode,
		session: base.session,
	});
	const resolvedChainIds = useMemo(
		() =>
			getSelectableCryptoChains(p.cryptoOptions, SUPPORTED_WEB3_CHAIN_IDS).map(
				c => c.chainId,
			),
		[p.cryptoOptions],
	);
	const reviewSessionBlockMessage = useReviewSessionBlockMessage(
		base.wagmi.connectedChecksummed,
		base.session,
	);
	return {
		fe,
		terminal,
		walletsInfo,
		isWalletVerified,
		polling,
		resolvedChainIds,
		reviewSessionBlockMessage,
	};
}

/**
 * Sub-split of `useDerivedCheckoutState` — owns just the fe-confirmation
 * hook wiring so neither sub-hook exceeds 60 lines.
 */
function useFeConfirmationFromBase(
	p: UseCryptoCheckoutModalParams,
	base: BaseCheckoutState,
) {
	const { ui, session, tx, wagmi, sessionConfirmedQuantityRef } = base;
	const confirmCryptoTxMutation = useConfirmCryptoTx();
	return useFeConfirmation({
		step: ui.step,
		txHash: tx.txHash,
		session: session.session,
		selectedChainId: session.selectedChainId,
		confirmationTarget: session.session?.confirmationTarget ?? null,
		observedConfirmationCount: wagmi.observedConfirmationCount,
		txSubmittedToBackend: tx.txSubmittedToBackend,
		txFailureCount: wagmi.txFailureCount,
		txError: wagmi.txError,
		refetchConfirmingBalance: () =>
			wagmi.refetchConfirmingBalance().then(r => ({
				data: r.data as bigint | undefined,
			})),
		confirmCryptoTxMutation,
		goToStep: ui.goToStep,
		setErrorMessage: ui.setErrorMessage,
		setFundsAtRisk: ui.setFundsAtRisk,
		onSuccessTransition: () => {
			p.onSuccess?.(sessionConfirmedQuantityRef.current.current);
		},
	});
}

// ==========================================
// Effect-wiring sub-hooks
// ==========================================

/**
 * Forwards the confirming flag to the parent. Called separately so the
 * main hook body stays under the 60-LOC cap.
 */
function useConfirmingStepNotifier(
	step: CheckoutStep,
	onConfirmingChange: ((isConfirming: boolean) => void) | undefined,
): void {
	const isConfirmingStep = step === 'confirming';
	// useEffect: sync target = parent's `isConfirming` flag.
	useEffect(() => {
		onConfirmingChange?.(isConfirmingStep);
	}, [isConfirmingStep, onConfirmingChange]);
}

/**
 * Keeps every cross-hook ref holder aligned with the live callables, runs
 * the terminal-sync effects hook, and clears the close-reset timer on
 * re-open.
 */
function useCheckoutWiringEffects(c: CoreCheckoutHooks): void {
	useCrossRefSyncEffects(c);
	useTerminalSyncAndReopen(c);
}

/**
 * Keeps every cross-hook ref holder aligned with the live callables. Four
 * tiny effects so each has a clean, auditable dep-list and so the parent
 * wiring hook stays under the 60-LOC cap.
 */
function useCrossRefSyncEffects(c: CoreCheckoutHooks): void {
	const {
		tx,
		fe,
		wagmi,
		session,
		liveAddressRef,
		liveChainIdRef,
		txApplyRuntimeStateRef,
		feTransitionToSuccessRef,
		feResetConfirmationRef,
		sessionConfirmedQuantityRef,
	} = c;
	useEffect(() => {
		txApplyRuntimeStateRef.current = tx.applyRuntimeState;
	});
	useEffect(() => {
		liveAddressRef.current = wagmi.connectedChecksummed;
		liveChainIdRef.current = wagmi.connectedChainId;
	});
	useEffect(() => {
		sessionConfirmedQuantityRef.current = session.confirmedTicketQuantity;
	});
	useEffect(() => {
		feTransitionToSuccessRef.current = fe.transitionToSuccess;
		feResetConfirmationRef.current = fe.resetConfirmation;
	});
}

/**
 * Runs the consolidated terminal-sync effects and the reopen-cancels-reset
 * safety net.
 */
function useTerminalSyncAndReopen(c: CoreCheckoutHooks): void {
	const { tx, fe, session, polling, terminal, guards, ui, p } = c;
	useCheckoutTerminalSync({
		step: ui.step,
		txHash: tx.txHash,
		submitRecoveryMode: tx.submitRecoveryMode,
		session: session.session,
		polledCheckoutStatus: polling.polledCheckoutStatus,
		activeConfirmingDeadline: polling.activeConfirmingDeadline,
		tx: {
			txSubmittedToBackend: tx.txSubmittedToBackend,
			backendTrackedTxHash: tx.backendTrackedTxHash,
			submitRetriedHashes: tx.submitRetriedHashes,
			lastReplacementReason: tx.lastReplacementReason,
			setTxHash: tx.setTxHash,
			setSubmitRecoveryMode: tx.setSubmitRecoveryMode,
			registerTxHashWithBackend: tx.registerTxHashWithBackend,
		},
		transitionToSuccess: fe.transitionToSuccess,
		goToStep: ui.goToStep,
		setErrorMessage: ui.setErrorMessage,
		failSubmittedTxRegistration: terminal.failSubmittedTxRegistration,
		failBackendTrackedReplacement: terminal.failBackendTrackedReplacement,
		failConfirmingWindowExpired: terminal.failConfirmingWindowExpired,
	});
	const { clearCloseReset } = guards;
	// Reopen cancels any delayed reset — without this a stale timeout can
	// wipe a resumed modal mid-interaction.
	useEffect(() => {
		if (!p.open) return;
		clearCloseReset();
	}, [clearCloseReset, p.open]);
}

/**
 * Wires `useWaitForTransactionReceipt` so wagmi's `onReplaced` event is
 * forwarded to tx-tracking and fe-confirmation's reorg guard resets when
 * the flow follows the replacement hash.
 */
function useReceiptAndRecoveryEffect(c: CoreCheckoutHooks): void {
	const { tx, fe, session, guards, ui } = c;
	const reorgHandledRef = fe.reorgHandled;
	useWaitForTransactionReceipt({
		hash: tx.txHash,
		chainId: session.selectedChainId ?? undefined,
		// 1 — fires `onReplaced` on first block inclusion. Using the chain's
		// `confirmationTarget` would delay replacement detection on
		// high-finality chains (e.g. Ethereum 12 blocks). Finalization is
		// tracked separately via `confirmationTarget`.
		confirmations: 1,
		pollingInterval: 4_000,
		onReplaced: replacement => {
			// Step guard lives inside the dispatcher — `onReplaced` is a
			// captured closure that can fire after the flow has already
			// transitioned out of `confirming` (parallel hydration,
			// terminal-sync routing). The `enabled` gate below blocks new
			// polling but does NOT stop an in-flight callback microtask.
			dispatchReplacementWithStepGuard({
				uiStep: ui.step,
				replacement,
				handleTransactionReplaced: tx.handleTransactionReplaced,
				releasePayInFlight: () => guards.releaseInFlightGuards(),
				reorgHandledRef,
			});
		},
		query: { enabled: ui.step === 'confirming' && !!tx.txHash },
	});
}

// ==========================================
// Smaller composition sub-hooks
// ==========================================

/** Owns the four pieces of modal-level UI state. */
function useModalUiState() {
	const [step, setStep] = useState<CheckoutStep>('select-chain');
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// True on ambiguous reorg (balance uncertain) — hides "Try Again" to
	// prevent double payment.
	const [fundsAtRisk, setFundsAtRisk] = useState(false);
	// Pure updater — NEVER side-effect the parent via `onConfirmingChange`
	// inside `setStep`. The updater function must be side-effect-free; a
	// parent setState here raises "Cannot update a component while rendering
	// a different component". Confirming notification runs in an effect.
	const goToStep = useCallback((next: CheckoutStep) => {
		setStep(c => (c === next ? c : next));
	}, []);
	return {
		step,
		isProcessing,
		errorMessage,
		fundsAtRisk,
		goToStep,
		setIsProcessing,
		setErrorMessage,
		setFundsAtRisk,
	};
}

/** Isolates the wagmi write-side hooks so they don't balloon the parent. */
function useModalWagmiWrite() {
	const { signMessageAsync } = useSignMessage();
	const { switchChainAsync } = useSwitchChain();
	// `useSendTransaction` + pre-encoded ERC-20 calldata instead of
	// `useWriteContract` as a targeted workaround for reown/appkit#5586.
	const { sendTransactionAsync, reset: resetSendTransaction } =
		useSendTransaction();
	return {
		signMessageAsync,
		switchChainAsync,
		sendTransactionAsync,
		resetSendTransaction,
	};
}

interface TerminalHandlersArgs {
	tx: ReturnType<typeof useTxTracking>;
	fe: ReturnType<typeof useFeConfirmation>;
	goToStep: (step: CheckoutStep) => void;
	setFundsAtRisk: (v: boolean) => void;
	setErrorMessage: (v: string | null) => void;
}

/**
 * Memoises the three terminal-failure factories so each keeps stable
 * identity — the terminal-sync effects include these callables in their
 * dep arrays.
 */
function useTerminalFailureHandlers(args: TerminalHandlersArgs) {
	const { tx, fe, goToStep, setFundsAtRisk, setErrorMessage } = args;
	const terminalSetters = useMemo(
		() => ({
			setSubmitRecoveryMode: tx.setSubmitRecoveryMode,
			setRetryBlocked: tx.setRetryBlocked,
			setFundsAtRisk,
			setErrorMessage,
			goToFailureStep: () => goToStep('failure'),
		}),
		[goToStep, tx, setFundsAtRisk, setErrorMessage],
	);
	const failSubmittedTxRegistration = useMemo(
		() => buildFailSubmittedTxRegistration(terminalSetters),
		[terminalSetters],
	);
	const failBackendTrackedReplacementHandler = useMemo(
		() => buildFailBackendTrackedReplacement(terminalSetters),
		[terminalSetters],
	);
	const failConfirmingWindowExpiredHandler = useMemo(
		() => buildFailConfirmingWindowExpired(terminalSetters),
		[terminalSetters],
	);
	const failConfirmingWindowExpired = useCallback(() => {
		failConfirmingWindowExpiredHandler({
			successAlreadyTransitioned: fe.successTransitioned.current,
			txSubmittedToBackend: tx.txSubmittedToBackend.current,
			txHash: tx.txHash,
		});
	}, [failConfirmingWindowExpiredHandler, fe, tx]);
	return {
		failSubmittedTxRegistration,
		failBackendTrackedReplacement: failBackendTrackedReplacementHandler,
		failConfirmingWindowExpired,
	};
}

interface PollingArgs {
	step: CheckoutStep;
	txHash: `0x${string}` | undefined;
	submitRecoveryMode: 'poll' | 'retry' | null;
	session: ReturnType<typeof useCheckoutSession>;
}

/**
 * Derives the active deadline + polling window + checkout-status query.
 *
 * Wrapped in `useMemo` keyed to stable deps — `getCryptoSessionGraceWindowMs`
 * calls `Date.now()` internally, so an inline const would produce a new
 * shrinking value every render. That would reset the polling hooks' effect,
 * causing `isExpired` to flicker false→true on each cycle.
 */
function usePollingAndDeadlines(args: PollingArgs) {
	const { step, txHash, submitRecoveryMode, session } = args;
	const activeConfirmingDeadline = txHash
		? session.session?.confirmDeadline
		: session.session?.submitDeadline;
	const confirmingPollWindowMs = useMemo(() => {
		if (step !== 'confirming' || !activeConfirmingDeadline) return undefined;
		return getCryptoSessionGraceWindowMs(activeConfirmingDeadline);
	}, [activeConfirmingDeadline, step]);
	// Avoid polling while the wallet prompt is still open. Start once there
	// is a tx hash, a submit recovery path, or backend ownership is tracked.
	const shouldPoll =
		step === 'confirming' && (!!txHash || submitRecoveryMode !== null);
	const { data: polledCheckoutStatus } = usePollCheckoutStatus(
		shouldPoll ? (session.session?.orderId ?? null) : null,
		confirmingPollWindowMs,
	);
	return { activeConfirmingDeadline, polledCheckoutStatus };
}

/** Maps the review-level session guard into the user-facing warning message. */
function useReviewSessionBlockMessage(
	connectedChecksummed: Address | null,
	session: ReturnType<typeof useCheckoutSession>,
): string | null {
	return useMemo(() => {
		const g = getReviewSessionGuard({
			connectedAddress: connectedChecksummed,
			sessionWalletAddress: session.sessionWalletAddress,
			submitDeadline: session.session?.submitDeadline,
		});
		switch (g.kind) {
			case 'wallet-changed':
				return 'Wallet changed. Continue again to bind the current wallet.';
			case 'session-expired':
				return 'Checkout session expired. Continue again to refresh it.';
			default:
				return null;
		}
	}, [connectedChecksummed, session.session, session.sessionWalletAddress]);
}
