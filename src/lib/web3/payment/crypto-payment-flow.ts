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
 *
 * @param hash - Raw transaction hash from wallet
 * @returns Lowercased hash for consistent comparisons
 */
export function normalizeTxHash(hash: string): string {
	return hash.toLowerCase();
}

/**
 * Converts a backend-provided deadline into remaining milliseconds.
 * Clamped at zero so callers can pass directly into timeout logic.
 *
 * @param deadline - ISO 8601 deadline string from the backend
 * @param now - Current timestamp in ms (default: Date.now())
 * @returns Remaining milliseconds until deadline, clamped at zero
 */
export function getCryptoSessionGraceWindowMs(
	deadline: string,
	now = Date.now(),
): number {
	return Math.max(0, new Date(deadline).getTime() - now);
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
 *
 * @param confirmations - Raw confirmation count from wagmi (bigint, number, or undefined)
 * @returns Normalized confirmation count as a plain number, clamped at zero
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
 *
 * @param error - Payment error code from crypto tx submit
 * @returns Outcome classification: retry, poll, or terminal
 */
/**
 * Backend error codes that indicate the session already moved forward
 * (completed / confirming / concurrently updated). Polling the current
 * order will converge — no need to resubmit the transaction hash.
 */
const POLL_OUTCOME_ERRORS = new Set<PaymentErrorCode>([
	PAYMENT_ERROR_CODES.CRYPTO_ALREADY_COMPLETED,
	PAYMENT_ERROR_CODES.CRYPTO_ALREADY_CONFIRMING,
	PAYMENT_ERROR_CODES.CRYPTO_CONCURRENT_UPDATE,
]);

/**
 * Transient failure modes where the caller should retry the submit
 * call itself — the backend may have accepted the hash (network blip,
 * 5xx, timeout) so retrying is safe and usually converges.
 */
const RETRY_OUTCOME_ERRORS = new Set<PaymentErrorCode>([
	PAYMENT_ERROR_CODES.CRYPTO_SUBMIT_FAILED,
	COMMON_ERROR_CODES.NETWORK_ERROR,
	COMMON_ERROR_CODES.TIMEOUT_ERROR,
	COMMON_ERROR_CODES.CONNECTION_ABORTED,
	COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
	COMMON_ERROR_CODES.SERVICE_UNAVAILABLE,
	COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED,
	COMMON_ERROR_CODES.UNKNOWN_ERROR,
]);

export function getCryptoTxSubmitOutcome(
	error: PaymentErrorCode,
): CryptoTxSubmitOutcome {
	if (POLL_OUTCOME_ERRORS.has(error)) return CRYPTO_TX_SUBMIT_OUTCOME.POLL;
	if (RETRY_OUTCOME_ERRORS.has(error)) return CRYPTO_TX_SUBMIT_OUTCOME.RETRY;
	// Everything else is terminal:
	//   * `tx-already-used` — hash bound to a different session, polling
	//     this order would never converge.
	//   * `invalid-tx-hash` — malformed input, user must fix and retry.
	//   * unknown codes — conservative default, surface a terminal error
	//     rather than pin the user on a 5-minute poll.
	return CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL;
}
