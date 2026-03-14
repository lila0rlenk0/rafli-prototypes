import {
	COMMON_ERROR_CODES,
	PAYMENT_ERROR_CODES,
	type PaymentErrorCode,
} from '@/types/errors';

// ==========================================
// Constants
// ==========================================

/**
 * Submit outcomes used by the crypto checkout modal.
 *
 * Why we split recovery in two:
 * - `retry` means the FE should retry `POST /crypto/submit` because transport or
 *   server noise may have hidden a successful write.
 * - `poll` means "keep the flow alive, but don't spam another submit" because the
 *   backend already knows something authoritative about the session.
 * - `terminal` means the backend gave us a deterministic rejection and the user
 *   needs an explicit failure state instead of silent waiting.
 */
export const CRYPTO_TX_SUBMIT_OUTCOME = {
	RETRY: 'retry',
	POLL: 'poll',
	TERMINAL: 'terminal',
} as const;

export type CryptoTxSubmitOutcome =
	(typeof CRYPTO_TX_SUBMIT_OUTCOME)[keyof typeof CRYPTO_TX_SUBMIT_OUTCOME];

// ==========================================
// Helpers
// ==========================================

/**
 * Normalizes a tx hash for deterministic FE comparisons.
 *
 * Backend PR 40 lowercases tx hashes on submit, so the FE must do the same before
 * comparing local wallet hashes against polled session data.
 */
export function normalizeTxHash(hash: string): string {
	return hash.toLowerCase();
}

/**
 * Parses a backend-provided grace deadline into an absolute millisecond timestamp.
 *
 * Backend now returns `submitDeadline` and `confirmDeadline` directly on session
 * responses, eliminating the need for FE-side grace constant duplication.
 */
export function getCryptoSessionGraceDeadline(deadline: string): number {
	return new Date(deadline).getTime();
}

/**
 * Converts a backend-provided deadline into remaining milliseconds.
 * Clamped at zero so callers can pass directly into timeout logic.
 */
export function getCryptoSessionGraceWindowMs(
	deadline: string,
	now = Date.now(),
): number {
	return Math.max(0, getCryptoSessionGraceDeadline(deadline) - now);
}

/**
 * Normalizes wagmi confirmation counts into a plain number for UI + FE-driven confirm.
 *
 * Keep wagmi's native semantics intact:
 * - inclusion block = 1 confirmation
 * - 1-confirmation chains should fast-path confirm on the receipt block
 *
 * Backend re-verifies confirmations independently, so the FE should not invent
 * a different counting scheme here.
 */
export function getObservedConfirmationCount(
	confirmations: bigint | number | undefined,
): number {
	if (confirmations === undefined) return 0;

	const numericConfirmations =
		typeof confirmations === 'bigint' ? Number(confirmations) : confirmations;

	return Math.max(0, numericConfirmations);
}

/**
 * Classifies submit failures into retry, poll-only, or terminal paths.
 *
 * Recovery errors all share one property: abandoning the confirming step would be
 * wrong because a retry or a follow-up poll can still converge safely.
 *
 * Examples:
 * - timeout/network/5xx: backend may already have accepted the hash, so retry once
 * - already-confirming/concurrent-update: backend already moved the session, so poll
 * - submit-failed: response shape broke, but polling can still recover the session
 */
export function getCryptoTxSubmitOutcome(
	error: PaymentErrorCode,
): CryptoTxSubmitOutcome {
	switch (error) {
		case PAYMENT_ERROR_CODES.CRYPTO_ALREADY_COMPLETED:
		case PAYMENT_ERROR_CODES.CRYPTO_ALREADY_CONFIRMING:
		case PAYMENT_ERROR_CODES.CRYPTO_CONCURRENT_UPDATE:
			return CRYPTO_TX_SUBMIT_OUTCOME.POLL;
		case PAYMENT_ERROR_CODES.CRYPTO_SUBMIT_FAILED:
		case COMMON_ERROR_CODES.NETWORK_ERROR:
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
		case COMMON_ERROR_CODES.CONNECTION_ABORTED:
		case COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR:
		case COMMON_ERROR_CODES.SERVICE_UNAVAILABLE:
		case COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED:
		case COMMON_ERROR_CODES.UNKNOWN_ERROR:
			return CRYPTO_TX_SUBMIT_OUTCOME.RETRY;
		default:
			return CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL;
	}
}
