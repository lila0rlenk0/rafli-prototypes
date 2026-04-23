'use client';

import { useEffect, type RefObject } from 'react';

import { getPolledTxHashSyncDecision } from '@/components/payment/crypto-checkout/session/session-guards';
import { mapPolledCryptoFailureReasonToUserMessage } from '@/lib/checkout/error-messages';
import {
	CRYPTO_TX_SUBMIT_OUTCOME,
	getCryptoSessionGraceWindowMs,
	normalizeTxHash,
} from '@/lib/web3/payment/crypto-payment-flow';
import { CHECKOUT_PHASE, type CheckoutStatus } from '@/types/checkout-status';
import type { CryptoCheckoutSession } from '@/types/wallet';

import { throwUnexpectedCase } from '@/components/payment/crypto-checkout/recovery/throw-unexpected';
import type {
	RegisterTxHashResult,
	ReplacementReason,
	SubmitRecoveryMode,
} from './use-tx-tracking';

// ==========================================
// Constants
// ==========================================

/** Default failure message when backend provides no actionable reason */
export const FALLBACK_FAILURE_MESSAGE =
	'Payment verification failed. Please try again.';

/**
 * 3s — below the 5s poll interval so the retry lands before the first poll
 * tick, maximising the chance backend converges without extra polls.
 */
const SUBMIT_RECOVERY_RETRY_MS = 3_000;

// ==========================================
// Types
// ==========================================

/**
 * Checkout step the hook drives via `goToStep` — structural so the hook
 * doesn't have to import the modal's step union.
 */
export type CheckoutStep =
	| 'select-chain'
	| 'select-token'
	| 'connect-wallet'
	| 'review'
	| 'confirming'
	| 'success'
	| 'failure';

/**
 * Shared refs / setters the five terminal-sync effects read from tx-tracking.
 *
 * Kept as a named interface so the hook body, the test helpers, and the
 * pure polling-phase reducer all reference the same surface instead of
 * redeclaring the ref shapes in three places.
 */
export interface TerminalSyncTxHandle {
	txSubmittedToBackend: RefObject<boolean>;
	backendTrackedTxHash: RefObject<string | null>;
	submitRetriedHashes: RefObject<Set<string>>;
	lastReplacementReason: RefObject<null | ReplacementReason>;
	setTxHash: (value: `0x${string}` | undefined) => void;
	setSubmitRecoveryMode: (value: SubmitRecoveryMode) => void;
	registerTxHashWithBackend: (
		hash: `0x${string}`,
	) => Promise<RegisterTxHashResult>;
}

/** Reactive inputs + modal-scope side-effect callables the hook consumes. */
export interface UseCheckoutTerminalSyncParams {
	step: CheckoutStep;
	txHash: `0x${string}` | undefined;
	submitRecoveryMode: SubmitRecoveryMode;
	session: CryptoCheckoutSession | null;
	polledCheckoutStatus: CheckoutStatus | undefined;
	activeConfirmingDeadline: string | undefined;
	tx: TerminalSyncTxHandle;
	transitionToSuccess: () => void;
	goToStep: (step: CheckoutStep) => void;
	setErrorMessage: (message: string | null) => void;
	failSubmittedTxRegistration: () => void;
	failBackendTrackedReplacement: (reason: null | ReplacementReason) => void;
	failConfirmingWindowExpired: () => void;
}

// ==========================================
// Pure helpers (module scope, testable)
// ==========================================

/**
 * Decides how the polling phase should transition the UI.
 *
 * The modal's original effect branched on `phase` with interleaved side
 * effects; extracting the decision lets the switch arms be unit-tested
 * without mounting React. `noop` is the default when polling has not yet
 * produced a terminal phase or when a FAILED phase is still retryable.
 *
 * @param status - Polled checkout status snapshot
 * @returns Discriminated decision the hook applies via setters
 */
export type PollingPhaseDecision =
	| { kind: 'noop' }
	| { kind: 'success' }
	| { kind: 'failure'; message: string };

/**
 * Pure reducer — given a polled status, decide which terminal transition
 * (if any) the confirming step should take. Keeps every branch of the
 * original effect covered by a targeted test.
 *
 * @param status - Polled checkout status, may be undefined between fetches
 * @returns `noop` when polling should continue, else the terminal decision
 */
export function derivePollingPhaseDecision(
	status: CheckoutStatus | undefined,
): PollingPhaseDecision {
	if (!status) return { kind: 'noop' };

	switch (status.phase) {
		case CHECKOUT_PHASE.COMPLETED:
			return { kind: 'success' };
		case CHECKOUT_PHASE.FAILED: {
			// canRetry on a FAILED phase means backend grace-period reactivation
			// is possible — the cron may find the tx on-chain and transition
			// back to confirming. Stay put and let polling detect the recovery.
			if (status.canRetry) return { kind: 'noop' };
			return {
				kind: 'failure',
				message: mapPolledCryptoFailureReasonToUserMessage(
					status.crypto?.failureReason,
					FALLBACK_FAILURE_MESSAGE,
				),
			};
		}
		case CHECKOUT_PHASE.AWAITING_PAYMENT: {
			// Session expired or was abandoned while we were confirming — no
			// active tx to wait for. Transition to failure immediately instead
			// of waiting for poll timeout.
			if (!status.crypto?.txHash) {
				return {
					kind: 'failure',
					message: 'Payment session expired. Please try again.',
				};
			}
			// txHash present but phase is awaiting_payment — transient state
			// while backend has not yet advanced to confirming (e.g. cron
			// hasn't run). Safe to continue polling.
			return { kind: 'noop' };
		}
		case CHECKOUT_PHASE.CONFIRMING:
			return { kind: 'noop' };
		default:
			return throwUnexpectedCase(
				status.phase,
				'deriveTerminalDecisionFromStatus',
			);
	}
}

// ==========================================
// Hook
// ==========================================

/**
 * Consolidates the five terminal-sync effects previously inlined in the
 * modal:
 *
 * 1. Hash sync — polling is authoritative once backend has bound a hash.
 * 2. Submit recovery — one bounded same-hash retry on ambiguous failures.
 * 3. Replacement detection — wallet hash diverges from backend hash.
 * 4. Polling-to-terminal — drives success / failure from `phase`.
 * 5. Session-expiry timer — uses the active backend deadline.
 *
 * Effects are wired individually so exhaustive-deps stays unambiguous and
 * future changes can be audited effect-by-effect.
 *
 * @param params - Reactive inputs + modal-scope callables
 */
export function useCheckoutTerminalSync(
	params: UseCheckoutTerminalSyncParams,
): void {
	// Effect #1: hash sync (original modal effect, lines 909–935)
	useSyncPolledTxHashEffect(params);
	// Effect #2: submit recovery (lines 945–990)
	useSubmitRecoveryEffect(params);
	// Effect #3: replacement detection (lines 1000–1020)
	useBackendHashReplacementEffect(params);
	// Effect #5: polling-to-terminal (lines 1031–1057)
	usePollingTerminalEffect(params);
	// Effect #7: session-expiry timer (lines 1066–1081)
	useSessionExpiryEffect(params);
}

// ==========================================
// Individual effect hooks (each keeps a tight dep list)
// ==========================================

/**
 * Effect #1 — Order polling is authoritative for whether backend has
 * accepted a hash. Closes the "response lost after commit" gap where a
 * submit POST may succeed server-side but fail client-side on the way
 * back.
 */
function useSyncPolledTxHashEffect(
	params: UseCheckoutTerminalSyncParams,
): void {
	const { step, txHash, polledCheckoutStatus, tx } = params;
	const polledTxHash = polledCheckoutStatus?.crypto?.txHash;
	useEffect(() => {
		if (step !== 'confirming') return;

		const decision = getPolledTxHashSyncDecision({
			localTxHash: txHash,
			polledTxHash,
		});
		if (decision.kind === 'noop') return;

		// Local aliases for the ref containers so the React Compiler doesn't
		// flag the ref mutations below as "mutating a hook argument". `tx` is
		// an object literal each render; its inner refs are the stable
		// identities we need to write through.
		const backendHashRef = tx.backendTrackedTxHash;
		const submittedRef = tx.txSubmittedToBackend;

		// Skip no-op updates once backend ownership is tracked and any missing
		// local hash has already been restored from polling.
		if (
			submittedRef.current &&
			backendHashRef.current === decision.normalizedBackendHash &&
			!decision.adoptLocalTxHash
		) {
			return;
		}

		backendHashRef.current = decision.normalizedBackendHash;
		submittedRef.current = true;
		tx.setSubmitRecoveryMode(null);
		if (decision.adoptLocalTxHash) {
			tx.setTxHash(decision.adoptLocalTxHash);
		}
	}, [step, polledTxHash, txHash, tx]);
}

/**
 * Effect #2 — One bounded same-hash retry after ambiguous submit failures.
 * Same-hash submit is idempotent on backend; repeated retries would just
 * amplify backend load during outages.
 */
function useSubmitRecoveryEffect(params: UseCheckoutTerminalSyncParams): void {
	const {
		step,
		txHash,
		submitRecoveryMode,
		session,
		polledCheckoutStatus,
		tx,
		failSubmittedTxRegistration,
	} = params;
	const polledTxHash = polledCheckoutStatus?.crypto?.txHash;
	useEffect(() => {
		if (
			step !== 'confirming' ||
			!txHash ||
			submitRecoveryMode !== CRYPTO_TX_SUBMIT_OUTCOME.RETRY
		)
			return;
		if (!session || tx.txSubmittedToBackend.current || polledTxHash) return;

		const normalizedHash = normalizeTxHash(txHash);
		if (tx.submitRetriedHashes.current.has(normalizedHash)) return;

		const timer = setTimeout(async () => {
			const outcome = await tx.registerTxHashWithBackend(txHash);

			// Only consume the one-shot retry slot when the request actually
			// dispatched. A short-circuit POLL outcome means the submit hook
			// found an overlapping in-flight submit and never touched the
			// network; burning the slot here would leave us with zero retries
			// available for any subsequent transient failure.
			if (outcome.kind !== CRYPTO_TX_SUBMIT_OUTCOME.POLL) {
				tx.submitRetriedHashes.current.add(normalizedHash);
			}

			if (outcome.kind === CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL) {
				failSubmittedTxRegistration();
			}
		}, SUBMIT_RECOVERY_RETRY_MS);

		return () => clearTimeout(timer);
	}, [
		step,
		txHash,
		submitRecoveryMode,
		session,
		polledTxHash,
		tx,
		failSubmittedTxRegistration,
	]);
}

/**
 * Effect #3 — Detect when the wallet's canonical hash diverges from the
 * backend-tracked hash. Irreducible backend-contract edge case from PR 40:
 * once backend is bound to hash A, a later wallet replacement to hash B
 * cannot be reconciled client-side.
 */
function useBackendHashReplacementEffect(
	params: UseCheckoutTerminalSyncParams,
): void {
	const {
		step,
		txHash,
		polledCheckoutStatus,
		tx,
		failBackendTrackedReplacement,
	} = params;
	// Proxy dep: the body reads backendTrackedTxHash.current (a ref, not
	// reactive). Including the polled hash here triggers a re-evaluation
	// after each poll tick that updates backendTrackedTxHash via the
	// hash-sync effect above. Without this, the effect would only fire on
	// txHash changes and miss backend hash updates from polling (e.g. cron
	// assigned a different hash).
	const polledTxHash = polledCheckoutStatus?.crypto?.txHash;
	useEffect(() => {
		if (step !== 'confirming' || !txHash) return;

		const trackedHash = tx.backendTrackedTxHash.current;
		if (!trackedHash) return;

		if (normalizeTxHash(txHash) === trackedHash) return;

		failBackendTrackedReplacement(tx.lastReplacementReason.current);
	}, [step, txHash, polledTxHash, failBackendTrackedReplacement, tx]);
}

/**
 * Effect #5 — Transition to success/failure when polling detects terminal
 * state. Backend now includes the nested `cryptoSession` object, so no
 * separate session poll is needed.
 */
function usePollingTerminalEffect(params: UseCheckoutTerminalSyncParams): void {
	const {
		step,
		polledCheckoutStatus,
		transitionToSuccess,
		goToStep,
		setErrorMessage,
	} = params;
	useEffect(() => {
		if (step !== 'confirming') return;

		const decision = derivePollingPhaseDecision(polledCheckoutStatus);
		switch (decision.kind) {
			case 'noop':
				return;
			case 'success':
				transitionToSuccess();
				return;
			case 'failure':
				setErrorMessage(decision.message);
				goToStep('failure');
				return;
			default:
				throwUnexpectedCase(decision, 'usePollingPhaseEffect');
		}
	}, [
		step,
		polledCheckoutStatus,
		transitionToSuccess,
		goToStep,
		setErrorMessage,
	]);
}

/**
 * Effect #7 — Session-expiry timer. Uses backend-provided deadlines
 * directly: `submitDeadline` before the tx hash lands, `confirmDeadline`
 * after. The active txHash state drives which deadline is observed.
 */
function useSessionExpiryEffect(params: UseCheckoutTerminalSyncParams): void {
	const { step, activeConfirmingDeadline, failConfirmingWindowExpired } =
		params;
	useEffect(() => {
		if (step !== 'confirming' || !activeConfirmingDeadline) return;

		const msUntilExpiry = getCryptoSessionGraceWindowMs(
			activeConfirmingDeadline,
		);

		// Already beyond the backend grace window — transition immediately.
		if (msUntilExpiry <= 0) {
			failConfirmingWindowExpired();
			return;
		}

		const timer = setTimeout(failConfirmingWindowExpired, msUntilExpiry);
		return () => clearTimeout(timer);
	}, [activeConfirmingDeadline, failConfirmingWindowExpired, step]);
}
