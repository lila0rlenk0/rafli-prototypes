'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
	CRYPTO_TX_SUBMIT_OUTCOME,
	getCryptoTxSubmitOutcome,
	normalizeTxHash,
} from '@/lib/web3/payment/crypto-payment-flow';
import { submitCryptoTx } from '@/services/payment/submit-crypto-tx';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { CryptoCheckoutSession } from '@/types/wallet';

import { throwUnexpectedCase } from '@/components/payment/crypto-checkout/recovery/throw-unexpected';
import {
	applyTxTrackingPatch,
	type ApplyRuntimeStateParams,
} from '@/components/payment/crypto-checkout/confirmation/tx-runtime-merge';
import type {
	ReplacementReason,
	SubmitRecoveryMode,
} from './use-tx-tracking-types';

// ==========================================
// Re-exports (stable public API)
// ==========================================

export type {
	ApplyRuntimeStateParams,
	ApplyRuntimeStateTarget,
} from '@/components/payment/crypto-checkout/confirmation/tx-runtime-merge';
export type {
	ReplacementReason,
	SubmitRecoveryMode,
} from './use-tx-tracking-types';
export { applyTxTrackingPatch } from '@/components/payment/crypto-checkout/confirmation/tx-runtime-merge';

// ==========================================
// Types
// ==========================================

/**
 * Backend-submit response discriminated by the same union the rest of
 * the modal (pay flow + submit-retry effect) already consumes.
 */
export type RegisterTxHashResult =
	| { kind: 'accepted' }
	| {
			kind: typeof CRYPTO_TX_SUBMIT_OUTCOME.POLL;
			error?: PaymentErrorCode;
	  }
	| {
			kind: typeof CRYPTO_TX_SUBMIT_OUTCOME.RETRY;
			error: PaymentErrorCode;
	  }
	| {
			kind: typeof CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL;
			error: PaymentErrorCode;
	  };

/**
 * Modal-owned side-effect adapters the hook can't own itself:
 * - `resetSendTransaction` — wagmi's `useSendTransaction` reset, must reset wagmi's own cache
 * - `resetFeConfirmation` — fe-confirmation hook's reset, owned by its own hook per plan
 * - `setErrorMessage` / `setFundsAtRisk` — modal-scope state setters
 * - `goToStep` — modal-scope step setter (used by `handleTransactionReplaced`)
 */
export interface UseTxTrackingDeps {
	session: CryptoCheckoutSession | null;
	resetSendTransaction: () => void;
	resetFeConfirmation: () => void;
	setErrorMessage: (message: string | null) => void;
	setFundsAtRisk: (value: boolean) => void;
	goToStep: (step: 'review') => void;
}

/** Outcome of the replacement handler — drives whether the caller should release in-flight flags. */
export interface HandleReplacementParams {
	reason: ReplacementReason;
	newHash: `0x${string}`;
}

// ==========================================
// Internal sub-hook: state + refs cluster
// ==========================================

interface TxTrackingStateBag {
	txHash: `0x${string}` | undefined;
	txSubmitted: boolean;
	submitRecoveryMode: SubmitRecoveryMode;
	retryBlocked: boolean;
	setTxHash: (v: `0x${string}` | undefined) => void;
	setTxSubmitted: (v: boolean) => void;
	setSubmitRecoveryMode: (v: SubmitRecoveryMode) => void;
	setRetryBlocked: (v: boolean) => void;
	txSubmittedToBackend: { current: boolean };
	backendTrackedTxHash: { current: string | null };
	submitRequestInFlight: { current: boolean };
	submitRetriedHashes: { current: Set<string> };
	lastReplacementReason: { current: null | ReplacementReason };
}

/**
 * Owns every piece of state + refs for tx-tracking. Split out so the
 * exported hook body stays under the 60-LOC cap and the declarations all
 * live in one readable spot (as required by `.claude/rules/code-style.md`).
 *
 * @returns Aggregate bag of state/setters/refs the hook wires into ops
 */
function useTxTrackingStateBag(): TxTrackingStateBag {
	const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
	// Guards double-payment — set true immediately after sendTransactionAsync
	// resolves, before React re-renders. Cleared only in handleReset.
	const [txSubmitted, setTxSubmitted] = useState(false);
	// Distinguishes "retry same-hash once" from "poll only" to avoid
	// unnecessary duplicate submits when backend already owns the session.
	const [submitRecoveryMode, setSubmitRecoveryMode] =
		useState<SubmitRecoveryMode>(null);
	// Some failures should not offer an immediate retry even if funds are not
	// definitely deducted yet (e.g. wallet cancelled after backend bound a hash).
	const [retryBlocked, setRetryBlocked] = useState(false);
	// Ref-based idempotency guard — synchronous, prevents duplicate backend
	// submissions under React batching / Strict Mode.
	const txSubmittedToBackend = useRef(false);
	// Exact hash backend has accepted for this session (PR 40 binds to one).
	const backendTrackedTxHash = useRef<string | null>(null);
	// Prevents overlapping submit calls (initial + one-shot retry).
	const submitRequestInFlight = useRef(false);
	// Bounded same-hash retry set — one retry per canonical tx hash.
	const submitRetriedHashes = useRef<Set<string>>(new Set());
	// Replacement reason is only observable at the wallet/RPC layer; stash
	// for later backend-hash mismatch messaging.
	const lastReplacementReason = useRef<null | ReplacementReason>(null);

	return {
		txHash,
		txSubmitted,
		submitRecoveryMode,
		retryBlocked,
		setTxHash,
		setTxSubmitted,
		setSubmitRecoveryMode,
		setRetryBlocked,
		txSubmittedToBackend,
		backendTrackedTxHash,
		submitRequestInFlight,
		submitRetriedHashes,
		lastReplacementReason,
	};
}

// ==========================================
// Hook
// ==========================================

/**
 * TX tracking + replacement state for the crypto checkout modal.
 *
 * Extracted from the modal's original `applyCheckoutRuntimeState` +
 * `registerTxHashWithBackend` + `handleTransactionReplaced` per Task M4
 * of the refactor plan. See `useTxTrackingStateBag` for the state/ref
 * declarations (split for the 60-LOC cap).
 *
 * @param deps - Modal-scope setters and wagmi reset callbacks
 * @returns TX tracking state, setters, and the three named operations
 */
export function useTxTracking(deps: UseTxTrackingDeps) {
	const bag = useTxTrackingStateBag();
	// Stable deps snapshot so the memoized operations below keep identity.
	// useEffect: sync target = keep depsRef aligned with the latest props.
	const depsRef = useRef(deps);
	useEffect(() => {
		depsRef.current = deps;
	});

	const applyRuntimeState = useCallback(
		(params: ApplyRuntimeStateParams) =>
			applyRuntimeViaBag(params, bag, depsRef),
		[bag],
	);
	const registerTxHashWithBackend = useCallback(
		(hash: `0x${string}`): Promise<RegisterTxHashResult> =>
			runRegisterTxHashWithBackend({
				hash,
				session: depsRef.current.session,
				submitRequestInFlight: bag.submitRequestInFlight,
				backendTrackedTxHash: bag.backendTrackedTxHash,
				txSubmittedToBackend: bag.txSubmittedToBackend,
				setSubmitRecoveryMode: bag.setSubmitRecoveryMode,
			}),
		[bag],
	);
	const handleTransactionReplaced = useCallback(
		(
			params: HandleReplacementParams & { releasePayInFlight: () => void },
		): 'unwound' | 'followed' =>
			runHandleTransactionReplaced(params, {
				lastReplacementReason: bag.lastReplacementReason,
				backendTrackedTxHash: bag.backendTrackedTxHash,
				txSubmittedToBackend: bag.txSubmittedToBackend,
				submitRetriedHashes: bag.submitRetriedHashes,
				setTxHash: bag.setTxHash,
				setSubmitRecoveryMode: bag.setSubmitRecoveryMode,
				applyRuntimeState,
				goToStepReview: () => depsRef.current.goToStep('review'),
			}),
		[applyRuntimeState, bag],
	);
	const resetTracking = useCallback(() => resetTxTrackingState(bag), [bag]);

	return {
		...bag,
		applyRuntimeState,
		registerTxHashWithBackend,
		handleTransactionReplaced,
		resetTracking,
	};
}

// ==========================================
// Runtime-apply helper
// ==========================================

/**
 * Delegates to `applyTxTrackingPatch` with the bag's refs/setters + the
 * modal-owned callbacks read lazily through `depsRef`. Kept at module
 * scope so the hook body stays tight and the `ApplyRuntimeStateTarget`
 * spread is assembled in exactly one spot.
 *
 * @param params - Canonical runtime state payload
 * @param bag - Internal state/ref bag
 * @param depsRef - Latest-props ref
 */
function applyRuntimeViaBag(
	params: ApplyRuntimeStateParams,
	bag: TxTrackingStateBag,
	depsRef: { current: UseTxTrackingDeps },
): void {
	applyTxTrackingPatch(params, {
		setTxHash: bag.setTxHash,
		setTxSubmitted: bag.setTxSubmitted,
		setSubmitRecoveryMode: bag.setSubmitRecoveryMode,
		setRetryBlocked: bag.setRetryBlocked,
		setErrorMessage: depsRef.current.setErrorMessage,
		setFundsAtRisk: depsRef.current.setFundsAtRisk,
		submitRequestInFlight: bag.submitRequestInFlight,
		submitRetriedHashes: bag.submitRetriedHashes,
		lastReplacementReason: bag.lastReplacementReason,
		backendTrackedTxHash: bag.backendTrackedTxHash,
		txSubmittedToBackend: bag.txSubmittedToBackend,
		resetSendTransaction: depsRef.current.resetSendTransaction,
		resetFeConfirmation: depsRef.current.resetFeConfirmation,
	});
}

// ==========================================
// Module-scope pure helpers
// ==========================================

/**
 * Resets every piece of tx-tracking state + refs to the initial values.
 * Extracted so `resetTracking` stays a one-liner and the reset sequence is
 * in one place for code review.
 *
 * @param bag - State/ref cluster returned by `useTxTrackingStateBag`
 */
function resetTxTrackingState(bag: TxTrackingStateBag): void {
	const {
		setTxHash,
		setTxSubmitted,
		setSubmitRecoveryMode,
		setRetryBlocked,
		submitRequestInFlight,
		txSubmittedToBackend,
		backendTrackedTxHash,
		submitRetriedHashes,
		lastReplacementReason,
	} = bag;
	setTxHash(undefined);
	setTxSubmitted(false);
	setSubmitRecoveryMode(null);
	setRetryBlocked(false);
	submitRequestInFlight.current = false;
	txSubmittedToBackend.current = false;
	backendTrackedTxHash.current = null;
	submitRetriedHashes.current.clear();
	lastReplacementReason.current = null;
}

// ==========================================
// Module-scope runner for handleTransactionReplaced
// ==========================================

interface RunHandleReplacementDeps {
	lastReplacementReason: { current: null | ReplacementReason };
	backendTrackedTxHash: { current: string | null };
	txSubmittedToBackend: { current: boolean };
	submitRetriedHashes: { current: Set<string> };
	setTxHash: (value: `0x${string}` | undefined) => void;
	setSubmitRecoveryMode: (value: SubmitRecoveryMode) => void;
	applyRuntimeState: (params: ApplyRuntimeStateParams) => void;
	goToStepReview: () => void;
}

/**
 * Handles wagmi's onReplaced event for speed-up/cancel tx replacements.
 * Extracted so the hook body stays under the 60-LOC cap while preserving
 * the exact ordering of ref writes + UI transitions.
 *
 * @param params - Replacement reason + new hash + releasePayInFlight callback
 * @param target - Hook refs + setters the runner mutates
 * @returns `'unwound'` when the call rolled state back to review, else `'followed'`
 */
function runHandleTransactionReplaced(
	params: HandleReplacementParams & { releasePayInFlight: () => void },
	target: RunHandleReplacementDeps,
): 'unwound' | 'followed' {
	const { reason, newHash, releasePayInFlight } = params;
	target.lastReplacementReason.current = reason;

	// If the wallet cancelled before backend accepted any hash, unwind cleanly
	// back to review — no payment tx remains to reconcile.
	if (
		reason === 'cancelled' &&
		!target.backendTrackedTxHash.current &&
		!target.txSubmittedToBackend.current
	) {
		target.applyRuntimeState({ txHash: undefined, txSubmitted: false });
		releasePayInFlight();
		toast.info('Transaction cancelled.');
		target.goToStepReview();
		return 'unwound';
	}

	// Follow the replacement hash while backend is still unbound.
	// If backend already accepted a different hash, the mismatch effect
	// (in the modal) will stop the flow with a clear support message.
	target.setTxHash(newHash);
	target.setSubmitRecoveryMode(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
	target.submitRetriedHashes.current.delete(normalizeTxHash(newHash));
	// Allow handlePay to run again if the replacement flow leads back to review.
	// Without this, a terminal path that skips handleReset leaves payInFlight
	// permanently true, silently blocking all future pay attempts.
	releasePayInFlight();
	return 'followed';
}

// ==========================================
// Module-scope runner for registerTxHashWithBackend
// ==========================================

interface RunRegisterTxHashArgs {
	hash: `0x${string}`;
	session: CryptoCheckoutSession | null;
	submitRequestInFlight: { current: boolean };
	backendTrackedTxHash: { current: string | null };
	txSubmittedToBackend: { current: boolean };
	setSubmitRecoveryMode: (value: SubmitRecoveryMode) => void;
}

/**
 * Runs one submit-tx backend request and maps the response into the
 * hook's `RegisterTxHashResult` union.
 *
 * @param args - Hash + session + hook refs + recovery setter
 * @returns Discriminated result the caller routes back into the pay flow
 */
async function runRegisterTxHashWithBackend(
	args: RunRegisterTxHashArgs,
): Promise<RegisterTxHashResult> {
	const {
		hash,
		session,
		submitRequestInFlight,
		backendTrackedTxHash,
		txSubmittedToBackend,
		setSubmitRecoveryMode,
	} = args;
	if (!session) {
		return {
			kind: CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL,
			error: PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND,
		};
	}
	if (submitRequestInFlight.current) {
		return { kind: CRYPTO_TX_SUBMIT_OUTCOME.POLL };
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
			return { kind: 'accepted' };
		}

		const outcome = getCryptoTxSubmitOutcome(result.error);
		switch (outcome) {
			case CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL:
				return {
					kind: CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL,
					error: result.error,
				};
			case CRYPTO_TX_SUBMIT_OUTCOME.POLL:
				setSubmitRecoveryMode(outcome);
				return { kind: outcome, error: result.error };
			case CRYPTO_TX_SUBMIT_OUTCOME.RETRY:
				setSubmitRecoveryMode(outcome);
				return { kind: outcome, error: result.error };
			default:
				return throwUnexpectedCase(outcome, 'runRegisterTxHashWithBackend');
		}
	} finally {
		submitRequestInFlight.current = false;
	}
}
