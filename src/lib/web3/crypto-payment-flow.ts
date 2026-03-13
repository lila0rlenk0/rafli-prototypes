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

/**
 * Backend submit endpoint keeps accepting tx hashes for 10 minutes after the
 * nominal checkout TTL. This covers the common "wallet approval happened right
 * at the deadline" case without forcing users into a false failure state.
 */
export const CRYPTO_SUBMIT_GRACE_MS = 10 * 60 * 1_000;

/**
 * Once backend already owns a tx hash, it keeps verifying the session for
 * 15 minutes after expiry. Confirming sessions can outlive the original
 * checkout TTL because the transaction may still be in mempool or waiting for
 * slow-chain confirmations (notably Polygon's 128-block threshold).
 */
export const CRYPTO_CONFIRMING_GRACE_MS = 15 * 60 * 1_000;

export type CryptoTxSubmitOutcome =
	(typeof CRYPTO_TX_SUBMIT_OUTCOME)[keyof typeof CRYPTO_TX_SUBMIT_OUTCOME];

/**
 * FE mirror of the backend's two post-expiry windows.
 *
 * - `submit`: tx not durably registered server-side yet
 * - `confirming`: backend already owns a tx hash or session moved to confirming
 */
export type CryptoConfirmingGracePhase = 'submit' | 'confirming';

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
 * Resolves the absolute timestamp when the FE should finally give up on a
 * confirming checkout.
 *
 * This must stay in lockstep with backend PR 40:
 * - pending/submit recovery: expiresAt + 10 minutes
 * - confirming verification: expiresAt + 15 minutes
 *
 * Keeping the deadline calculation pure lets both the modal effect and the
 * polling hooks share one source of truth instead of re-encoding timing rules.
 */
export function getCryptoSessionGraceDeadline(
	expiresAt: string,
	phase: CryptoConfirmingGracePhase,
): number {
	const expiresAtMs = new Date(expiresAt).getTime();
	const graceMs =
		phase === 'confirming'
			? CRYPTO_CONFIRMING_GRACE_MS
			: CRYPTO_SUBMIT_GRACE_MS;

	return expiresAtMs + graceMs;
}

/**
 * Converts the absolute grace deadline into a poll/timer budget.
 *
 * We clamp at zero so callers can pass the result directly into timeout logic
 * without needing their own negative-duration guards.
 */
export function getCryptoSessionGraceWindowMs(
	expiresAt: string,
	phase: CryptoConfirmingGracePhase,
	now = Date.now(),
): number {
	return Math.max(0, getCryptoSessionGraceDeadline(expiresAt, phase) - now);
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
