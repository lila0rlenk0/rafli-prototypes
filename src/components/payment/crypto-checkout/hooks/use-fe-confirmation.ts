'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isTransactionNotFound } from '@/lib/web3/errors';
import type { PaymentErrorCode } from '@/types/errors';
import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';
import type { CryptoTxMutationResponse } from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';
import type {
	ConfirmCryptoTxPayload,
	CryptoCheckoutSession,
} from '@/types/wallet';

import {
	handleConfirmationFailure,
	REORG_FUNDS_AT_RISK_MESSAGE,
	REORG_FUNDS_SAFE_MESSAGE,
	REORG_NO_SESSION_MESSAGE,
} from '@/components/payment/crypto-checkout/confirmation/fe-confirmation-adapters';

// ==========================================
// Types
// ==========================================

/** Modal-owned hooks / setters the fe-confirmation hook needs to drive. */
export interface UseFeConfirmationDeps {
	step:
		| 'select-chain'
		| 'select-token'
		| 'connect-wallet'
		| 'review'
		| 'confirming'
		| 'success'
		| 'failure';
	txHash: `0x${string}` | undefined;
	session: CryptoCheckoutSession | null;
	selectedChainId: number | null;
	confirmationTarget: number | null;
	observedConfirmationCount: number;
	/** Synchronously-set idempotency guard owned by tx-tracking. */
	txSubmittedToBackend: RefObject<boolean>;
	/** Failure count from wagmi's `useTransaction` — powers reorg detection. */
	txFailureCount: number;
	/** wagmi's typed tx read error — only `TransactionNotFoundError` triggers reorg logic. */
	txError: Error | null;
	/** Fresh balance refetch scoped to the session's bound wallet. */
	refetchConfirmingBalance: () => Promise<{ data: bigint | undefined }>;
	confirmCryptoTxMutation: UseMutationResult<
		ServiceResponse<CryptoTxMutationResponse, PaymentErrorCode>,
		Error,
		ConfirmCryptoTxPayload
	>;
	goToStep: (step: 'failure' | 'success') => void;
	setErrorMessage: (message: string | null) => void;
	setFundsAtRisk: (value: boolean) => void;
	/**
	 * Idempotent `onSuccess(confirmedQuantity)` transition owned by the modal.
	 */
	onSuccessTransition: () => void;
}

interface FeConfirmationState {
	finalizationRequested: boolean;
	setFinalizationRequested: (value: boolean) => void;
	confirmRetryTick: number;
	setConfirmRetryTick: (value: number | ((prev: number) => number)) => void;
	confirmRetryAttemptsRef: RefObject<number>;
	txConfirmRequested: RefObject<boolean>;
	txConfirmInFlight: RefObject<boolean>;
	successTransitioned: RefObject<boolean>;
	reorgHandled: RefObject<boolean>;
	mountedRef: RefObject<boolean>;
	confirmRetryTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
}

// ==========================================
// Hook
// ==========================================

/**
 * FE-driven confirmation + reorg handling for crypto checkout.
 *
 * Extracted from the modal's effect #4 (FE-driven finalization) and effect
 * #6 (reorg detection). All state the plan's Task M4 pins to this hook
 * lives here so the parent modal never has to juggle these refs directly.
 *
 * Each `useEffect` body delegates to a module-scope named function so the
 * hook body stays under the 60-LOC cap.
 *
 * @param deps - Reactive inputs + modal-scope setters
 * @returns FE confirmation state, refs, and the two exported operations
 */
export function useFeConfirmation(deps: UseFeConfirmationDeps) {
	const state = useFeConfirmationState();
	// useEffect: sync target = keep depsRef aligned with latest props so
	// memoized ops + async runners resolve to current setters on fire.
	const depsRef = useRef(deps);
	useEffect(() => {
		depsRef.current = deps;
	});
	const transitionToSuccess = useCallback(
		() =>
			runTransitionToSuccess({
				successTransitioned: state.successTransitioned,
				depsRef,
			}),
		[state.successTransitioned],
	);
	const resetConfirmation = useCallback(
		() =>
			runResetConfirmation({
				setFinalizationRequested: state.setFinalizationRequested,
				setConfirmRetryTick: state.setConfirmRetryTick,
				confirmRetryAttemptsRef: state.confirmRetryAttemptsRef,
				txConfirmRequested: state.txConfirmRequested,
				txConfirmInFlight: state.txConfirmInFlight,
				successTransitioned: state.successTransitioned,
				reorgHandled: state.reorgHandled,
				confirmRetryTimerRef: state.confirmRetryTimerRef,
			}),
		[state],
	);
	useFeConfirmationEffects({
		deps,
		depsRef,
		confirmRetryAttemptsRef: state.confirmRetryAttemptsRef,
		confirmRetryTimerRef: state.confirmRetryTimerRef,
		txConfirmRequested: state.txConfirmRequested,
		txConfirmInFlight: state.txConfirmInFlight,
		reorgHandled: state.reorgHandled,
		mountedRef: state.mountedRef,
		confirmRetryTick: state.confirmRetryTick,
		setFinalizationRequested: state.setFinalizationRequested,
		setConfirmRetryTick: state.setConfirmRetryTick,
		transitionToSuccess,
	});
	// Shape preserved for the modal; consumers destructure individual keys.
	return {
		finalizationRequested: state.finalizationRequested,
		confirmRetryTick: state.confirmRetryTick,
		confirmRetryAttemptsRef: state.confirmRetryAttemptsRef,
		txConfirmRequested: state.txConfirmRequested,
		txConfirmInFlight: state.txConfirmInFlight,
		successTransitioned: state.successTransitioned,
		reorgHandled: state.reorgHandled,
		confirmRetryTimerRef: state.confirmRetryTimerRef,
		setFinalizationRequested: state.setFinalizationRequested,
		setConfirmRetryTick: state.setConfirmRetryTick,
		transitionToSuccess,
		resetConfirmation,
	};
}

/** Holds FE-confirmation refs/state so the exported hook stays short. */
function useFeConfirmationState(): FeConfirmationState {
	const [finalizationRequested, setFinalizationRequested] = useState(false);
	const [confirmRetryTick, setConfirmRetryTick] = useState(0);
	const confirmRetryAttemptsRef = useRef(0);
	const txConfirmRequested = useRef(false);
	const txConfirmInFlight = useRef(false);
	const successTransitioned = useRef(false);
	const reorgHandled = useRef(false);
	const mountedRef = useRef(true);
	const confirmRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	return {
		finalizationRequested,
		setFinalizationRequested,
		confirmRetryTick,
		setConfirmRetryTick,
		confirmRetryAttemptsRef,
		txConfirmRequested,
		txConfirmInFlight,
		successTransitioned,
		reorgHandled,
		mountedRef,
		confirmRetryTimerRef,
	};
}

// ==========================================
// Effect composition
// ==========================================

interface UseFeConfirmationEffectsArgs extends FinalizationEffectRefs {
	deps: UseFeConfirmationDeps;
	reorgHandled: RefObject<boolean>;
	mountedRef: RefObject<boolean>;
}

/**
 * Wires the four `useEffect` hooks this module owns in one place so the
 * exported hook body stays under the 60-LOC cap.
 *
 * Each individual `use*Effect` still declares its own `useEffect` with a
 * tight dep list — this wrapper only composes them in a fixed order.
 *
 * @param args - Reactive deps + refs + callables the effects read/write
 */
function useFeConfirmationEffects(args: UseFeConfirmationEffectsArgs): void {
	const {
		deps,
		confirmRetryAttemptsRef,
		confirmRetryTimerRef,
		reorgHandled,
		mountedRef,
	} = args;
	useFinalizationEffect(deps, args);
	useCancelRetryTimerEffect(
		deps.step,
		confirmRetryAttemptsRef,
		confirmRetryTimerRef,
	);
	useReorgEffect({
		step: deps.step,
		txHash: deps.txHash,
		txFailureCount: deps.txFailureCount,
		txError: deps.txError,
		depsRef: args.depsRef,
		reorgHandled,
		mountedRef,
	});
	useUnmountTimerCleanup(confirmRetryTimerRef);
	useUnmountMountedFlagCleanup(mountedRef);
}

// ==========================================
// Module-scope operation runners
// ==========================================

interface TransitionToSuccessRefs {
	successTransitioned: RefObject<boolean>;
	depsRef: RefObject<UseFeConfirmationDeps>;
}

/**
 * Idempotent success transition — guards against double `onSuccess()`
 * when FE-driven confirm and polling detect COMPLETED simultaneously.
 *
 * @param refs - Idempotency ref + latest-deps ref
 */
function runTransitionToSuccess(refs: TransitionToSuccessRefs): void {
	if (refs.successTransitioned.current) return;
	refs.successTransitioned.current = true;
	refs.depsRef.current.goToStep('success');
	refs.depsRef.current.onSuccessTransition();
}

interface ResetConfirmationRefs {
	setFinalizationRequested: (v: boolean) => void;
	setConfirmRetryTick: (v: number) => void;
	confirmRetryAttemptsRef: RefObject<number>;
	txConfirmRequested: RefObject<boolean>;
	txConfirmInFlight: RefObject<boolean>;
	successTransitioned: RefObject<boolean>;
	reorgHandled: RefObject<boolean>;
	confirmRetryTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
}

/**
 * Full reset for every piece of fe-confirmation state + refs. Called by
 * tx-tracking's `applyRuntimeState` and by the modal's `handleReset`.
 *
 * @param refs - State setters + refs owned by the hook
 */
function runResetConfirmation(refs: ResetConfirmationRefs): void {
	refs.setFinalizationRequested(false);
	refs.setConfirmRetryTick(0);
	refs.confirmRetryAttemptsRef.current = 0;
	refs.txConfirmRequested.current = false;
	refs.txConfirmInFlight.current = false;
	refs.successTransitioned.current = false;
	refs.reorgHandled.current = false;
	if (refs.confirmRetryTimerRef.current) {
		clearTimeout(refs.confirmRetryTimerRef.current);
		refs.confirmRetryTimerRef.current = null;
	}
}

// ==========================================
// Effect hooks (module scope)
// ==========================================

interface FinalizationEffectRefs {
	depsRef: RefObject<UseFeConfirmationDeps>;
	confirmRetryAttemptsRef: RefObject<number>;
	confirmRetryTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
	txConfirmRequested: RefObject<boolean>;
	txConfirmInFlight: RefObject<boolean>;
	confirmRetryTick: number;
	setFinalizationRequested: (v: boolean) => void;
	setConfirmRetryTick: (updater: (prev: number) => number) => void;
	transitionToSuccess: () => void;
}

/**
 * Effect #4 — FE-driven finalization. Fires a single confirm request once
 * observed confirmations reach the target; retry/terminal handling lives
 * in `handleConfirmationFailure`.
 */
function useFinalizationEffect(
	deps: UseFeConfirmationDeps,
	refs: FinalizationEffectRefs,
): void {
	const {
		step,
		txHash,
		session,
		selectedChainId,
		confirmationTarget,
		observedConfirmationCount,
	} = deps;
	useEffect(() => {
		if (
			step !== 'confirming' ||
			!txHash ||
			!session ||
			!selectedChainId ||
			confirmationTarget === null
		)
			return;
		const depsSnapshot = refs.depsRef.current;
		const txSubmittedToBackend = depsSnapshot.txSubmittedToBackend;
		if (!txSubmittedToBackend.current) return;
		if (refs.txConfirmRequested.current || refs.txConfirmInFlight.current)
			return;
		if (observedConfirmationCount < confirmationTarget) return;
		void runConfirmationRequest({
			sessionId: session.id,
			txHash,
			chainId: selectedChainId,
			confirmations: observedConfirmationCount,
			...refs,
		});
	}, [
		step,
		txHash,
		session,
		selectedChainId,
		confirmationTarget,
		observedConfirmationCount,
		refs,
	]);
}

/**
 * Cancels the confirm-retry timer whenever the modal leaves the
 * `confirming` step. Zeroes the attempts counter so a future retry starts
 * from a clean slate.
 */
function useCancelRetryTimerEffect(
	step: UseFeConfirmationDeps['step'],
	attemptsRef: RefObject<number>,
	timerRef: RefObject<ReturnType<typeof setTimeout> | null>,
): void {
	useEffect(() => {
		if (step === 'confirming') return;
		attemptsRef.current = 0;
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, [step, attemptsRef, timerRef]);
}

interface ReorgEffectRefs {
	depsRef: RefObject<UseFeConfirmationDeps>;
	reorgHandled: RefObject<boolean>;
	/**
	 * Live mounted flag — flipped to `false` in the hook's unmount
	 * cleanup. Checked inside `runReorgCheck` after every `await` so the
	 * async runner never writes to `depsRef.current` setters on an
	 * unmounted tree.
	 */
	mountedRef: RefObject<boolean>;
}

/**
 * Effect #6 — reorg detection. Fires `runReorgCheck` once when wagmi
 * reports a persistent `TransactionNotFound`.
 */
interface ReorgEffectArgs extends ReorgEffectRefs {
	step: UseFeConfirmationDeps['step'];
	txHash: UseFeConfirmationDeps['txHash'];
	txFailureCount: number;
	txError: Error | null;
}

function useReorgEffect(args: ReorgEffectArgs): void {
	const {
		step,
		txHash,
		txFailureCount,
		txError,
		depsRef,
		reorgHandled,
		mountedRef,
	} = args;
	useEffect(
		() =>
			maybeStartReorgCheck({
				step,
				txHash,
				txFailureCount,
				txError,
				depsRef,
				reorgHandled,
				mountedRef,
			}),
		[step, txHash, txFailureCount, txError, depsRef, reorgHandled, mountedRef],
	);
}

/**
 * Evaluates the reorg trigger and, if all conditions hold, locks the
 * idempotency ref and kicks off `runReorgCheck`. Returns undefined so
 * the `useEffect` has no cleanup.
 *
 * @param args - Reactive inputs + refs the effect mutates
 */
function maybeStartReorgCheck(args: ReorgEffectArgs): void {
	const {
		step,
		txHash,
		txFailureCount,
		txError,
		depsRef,
		reorgHandled,
		mountedRef,
	} = args;
	if (step !== 'confirming' || !txHash) return;
	if (!depsRef.current.txSubmittedToBackend.current) return;
	const txLikelyGone = txFailureCount >= 2 && isTransactionNotFound(txError);
	if (!txLikelyGone) return;
	if (reorgHandled.current) return;
	reorgHandled.current = true;
	void runReorgCheck({ depsRef, reorgHandled, mountedRef });
}

/**
 * Unmount safety net — flips the live `mountedRef` to `false` so
 * `runReorgCheck`'s post-await branches short-circuit before writing to
 * `depsRef.current.*` setters on an unmounted tree.
 *
 * @param mountedRef - Mount flag shared with `runReorgCheck`
 */
function useUnmountMountedFlagCleanup(mountedRef: RefObject<boolean>): void {
	useEffect(
		() => () => {
			mountedRef.current = false;
		},
		[mountedRef],
	);
}

/** Unmount safety net — clears the retry timer when the hook unmounts. */
function useUnmountTimerCleanup(
	timerRef: RefObject<ReturnType<typeof setTimeout> | null>,
): void {
	useEffect(
		() => () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		},
		[timerRef],
	);
}

// ==========================================
// Module-scope async runners
// ==========================================

type RunConfirmationRequestArgs = FinalizationEffectRefs & {
	sessionId: string;
	txHash: `0x${string}`;
	chainId: number;
	confirmations: number;
};

/**
 * Runs one FE-driven finalization request and handles the response.
 *
 * The five-way failure branch lives in `handleConfirmationFailure` so
 * tests can exercise every arm without mounting React.
 *
 * @param args - Session identity, retry refs, and UI-facing setters
 */
async function runConfirmationRequest(
	args: RunConfirmationRequestArgs,
): Promise<void> {
	const {
		sessionId,
		txHash,
		chainId,
		confirmations,
		depsRef,
		confirmRetryAttemptsRef,
		confirmRetryTimerRef,
		txConfirmRequested,
		txConfirmInFlight,
		setFinalizationRequested,
		setConfirmRetryTick,
		transitionToSuccess,
	} = args;
	txConfirmInFlight.current = true;
	try {
		const result = await depsRef.current.confirmCryptoTxMutation.mutateAsync({
			sessionId,
			txHash,
			chainId,
			confirmations,
		});

		if (!result.success) {
			handleConfirmationFailure(result.error, {
				depsRef,
				confirmRetryAttemptsRef,
				confirmRetryTimerRef,
				setConfirmRetryTick,
			});
			return;
		}

		confirmRetryAttemptsRef.current = 0;
		if (result.data.status === CRYPTO_PAYMENT_STATUS.COMPLETED) {
			// Only lock the idempotency guard on COMPLETED — non-terminal statuses
			// (e.g. backend returned FAILED during grace-period) should remain
			// retryable so the next confirmRetryTick or confirmation-count change
			// can re-trigger this effect.
			txConfirmRequested.current = true;
			setFinalizationRequested(true);
			transitionToSuccess();
		}
	} finally {
		txConfirmInFlight.current = false;
	}
}

/**
 * Runs the reorg recovery flow once: rechecks balance, classifies into
 * funds-safe vs funds-at-risk, and transitions to the failure step.
 *
 * The `reorgHandled` ref is released only when the balance probe is
 * inconclusive so the next tick can retry cleanly.
 *
 * Exported so unit tests can drive the post-await state-writes path
 * without mounting the host hook tree.
 *
 * @param args - Deps ref + the idempotency ref already locked by the caller
 */
export async function runReorgCheck(args: ReorgEffectRefs): Promise<void> {
	const { depsRef, reorgHandled, mountedRef } = args;

	const { data: freshBalance } =
		await depsRef.current.refetchConfirmingBalance();

	// Post-await mounted check — if the modal closed while
	// `refetchConfirmingBalance` was in flight, any downstream setter
	// write lands on an unmounted tree. Ref-based idempotency guards
	// also need to stay untouched so the next open starts clean.
	if (!mountedRef.current) return;

	// If the balance probe also failed, we still do not know whether the tx
	// actually vanished or the RPC is just degraded. Keep confirming alive and
	// let the next successful poll decide instead of forcing a false failure.
	if (freshBalance === undefined) {
		reorgHandled.current = false;
		return;
	}

	const { session } = depsRef.current;
	if (!session) {
		depsRef.current.setErrorMessage(REORG_NO_SESSION_MESSAGE);
		depsRef.current.goToStep('failure');
		return;
	}

	const paymentAmount = BigInt(session.amountRaw);
	const fundsStillAvailable = freshBalance >= paymentAmount;

	if (fundsStillAvailable) {
		depsRef.current.setErrorMessage(REORG_FUNDS_SAFE_MESSAGE);
	} else {
		// Funds appear deducted but tx vanished — ambiguous state, need support.
		// fundsAtRisk disables "Try Again" in FailureStep to prevent duplicate payment.
		depsRef.current.setFundsAtRisk(true);
		depsRef.current.setErrorMessage(REORG_FUNDS_AT_RISK_MESSAGE);
	}
	depsRef.current.goToStep('failure');
}
