import {
	isTerminalConfirmError,
	shouldScheduleConfirmRetry,
} from '@/components/payment/crypto-checkout/session/session-guards';
import { getPaymentErrorMessage } from '@/lib/checkout/error-messages';
import type { PaymentErrorCode } from '@/types/errors';

// ==========================================
// Constants
// ==========================================

/** Prevent noisy infinite FE-driven confirm retries on persistent backend errors. */
export const MAX_FE_CONFIRM_RETRIES = 3;

/** Reorg error message when a tx on-chain vanished but funds were not deducted. */
export const REORG_FUNDS_SAFE_MESSAGE =
	'Your transaction was removed from the blockchain (chain reorganization). Your funds were not deducted — you can safely try again.';
/** Reorg error message when funds appear deducted but tx vanished (ambiguous). */
export const REORG_FUNDS_AT_RISK_MESSAGE =
	'Your transaction may have been affected by a chain reorganization. Please contact support with your transaction hash for assistance.';
/** Fallback when reorg detection can't reach the session (should be unreachable post-hydration). */
export const REORG_NO_SESSION_MESSAGE =
	'Transaction may have been removed from the blockchain. Please contact support.';

// ==========================================
// Types
// ==========================================

interface MutableRef<T> {
	current: T;
}

/**
 * Minimal deps surface for `handleConfirmationFailure`. Kept as a local
 * interface so the unit tests never have to pull in React / wagmi /
 * React Query shapes just to exercise the branching.
 */
export interface HandleConfirmationFailureDeps {
	depsRef: {
		current: {
			setErrorMessage: (value: string | null) => void;
			goToStep: (step: 'failure') => void;
		};
	};
	confirmRetryAttemptsRef: MutableRef<number>;
	confirmRetryTimerRef: MutableRef<ReturnType<typeof setTimeout> | null>;
	setConfirmRetryTick: (updater: (prev: number) => number) => void;
}

// ==========================================
// Pure helper
// ==========================================

/**
 * Branches the failure of a FE-driven finalization call into terminal vs
 * retryable vs deferred. Preserves the original precedence exactly so the
 * observable behavior mirrors the pre-refactor effect.
 *
 * - Terminal — hydrate the failure step with the mapped user message.
 * - Deferred — log and let polling/cron pick up the finalization.
 * - Retry-cap — log and defer (prevents runaway retry storms).
 * - Retryable — bump the attempts counter and schedule a 5s retry tick.
 *
 * @param error - Payment error code returned by the confirmCryptoTx action
 * @param target - Setter + ref surface owned by the hook
 */
export function handleConfirmationFailure(
	error: PaymentErrorCode,
	target: HandleConfirmationFailureDeps,
): void {
	const {
		depsRef,
		confirmRetryAttemptsRef,
		confirmRetryTimerRef,
		setConfirmRetryTick,
	} = target;
	if (isTerminalConfirmError(error)) {
		depsRef.current.setErrorMessage(getPaymentErrorMessage(error));
		depsRef.current.goToStep('failure');
		return;
	}

	if (!shouldScheduleConfirmRetry(error)) {
		console.warn('FE-driven confirm deferred to polling:', error);
		return;
	}

	if (confirmRetryAttemptsRef.current >= MAX_FE_CONFIRM_RETRIES) {
		console.warn(
			'FE-driven confirm retry cap reached, deferring to polling:',
			error,
		);
		return;
	}

	confirmRetryAttemptsRef.current += 1;
	console.error('FE-driven confirm failed, scheduling retry:', error);
	confirmRetryTimerRef.current = setTimeout(() => {
		confirmRetryTimerRef.current = null;
		setConfirmRetryTick(t => t + 1);
	}, 5_000);
}
