import { normalizeTxHash } from '@/lib/web3/payment/crypto-payment-flow';

import type {
	ReplacementReason,
	SubmitRecoveryMode,
} from '@/components/payment/crypto-checkout/hooks/use-tx-tracking-types';

// ==========================================
// Types
// ==========================================

/**
 * Runtime-state apply payload mirrors the original inline param set.
 * Defaults match the previous inline-closure behavior so callers never
 * need to pass a fully populated object just to clear a subset of state.
 */
export interface ApplyRuntimeStateParams {
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

/**
 * Mutation target the pure apply helper writes through. Kept as a plain
 * interface so the hook and the tests share the same signature without
 * pulling in the full wagmi/React dependency graph.
 */
export interface ApplyRuntimeStateTarget {
	setTxHash: (value: `0x${string}` | undefined) => void;
	setTxSubmitted: (value: boolean) => void;
	setSubmitRecoveryMode: (value: SubmitRecoveryMode) => void;
	setRetryBlocked: (value: boolean) => void;
	setErrorMessage: (value: string | null) => void;
	setFundsAtRisk: (value: boolean) => void;
	submitRequestInFlight: { current: boolean };
	submitRetriedHashes: { current: Set<string> };
	lastReplacementReason: { current: null | ReplacementReason };
	backendTrackedTxHash: { current: string | null };
	txSubmittedToBackend: { current: boolean };
	resetSendTransaction: () => void;
	resetFeConfirmation: () => void;
}

// ==========================================
// Pure helper
// ==========================================

/**
 * Pure mutator for `applyRuntimeState` — all side-effects concentrated here
 * so the exported hook body stays under the `.ts` 60-LOC cap and the
 * transition sequence is unit-testable without mounting the hook.
 *
 * Preserves the original modal sequence:
 *   setTxHash → setTxSubmitted → setSubmitRecoveryMode →
 *   resetFeConfirmation → setFundsAtRisk → setRetryBlocked →
 *   setErrorMessage → ref resets → wagmi reset.
 *
 * @param params - Runtime state values mirroring the original inline payload
 * @param target - Setters + ref containers to mutate
 */
export function applyTxTrackingPatch(
	params: ApplyRuntimeStateParams,
	target: ApplyRuntimeStateTarget,
): void {
	const {
		txHash: nextTxHash,
		txSubmitted: nextTxSubmitted,
		submitRecoveryMode: nextSubmitRecoveryMode = null,
		backendTrackedHash = null,
		backendOwnsTx = false,
		fundsAtRisk: nextFundsAtRisk = false,
		retryBlocked: nextRetryBlocked = false,
		errorMessage: nextErrorMessage = null,
	} = params;

	target.setTxHash(nextTxHash);
	target.setTxSubmitted(nextTxSubmitted);
	target.setSubmitRecoveryMode(nextSubmitRecoveryMode);
	// fe-confirmation owns `finalizationRequested` + retry-tick + retry-attempts +
	// success/reorg/confirm-request/confirm-in-flight refs. Delegating here keeps
	// the cross-cluster reset atomic without leaking refs across hook boundaries.
	target.resetFeConfirmation();
	target.setFundsAtRisk(nextFundsAtRisk);
	target.setRetryBlocked(nextRetryBlocked);
	target.setErrorMessage(nextErrorMessage);

	target.submitRequestInFlight.current = false;
	target.submitRetriedHashes.current.clear();
	target.lastReplacementReason.current = null;
	target.backendTrackedTxHash.current = backendTrackedHash
		? normalizeTxHash(backendTrackedHash)
		: null;
	target.txSubmittedToBackend.current = backendOwnsTx;
	target.resetSendTransaction();
}
