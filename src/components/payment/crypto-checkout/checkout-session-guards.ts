import { isValidTxHash } from '@/lib/web3/block-explorers';
import { normalizeTxHash } from '@/lib/web3/crypto-payment-flow';
import {
	CRYPTO_PAYMENT_STATUS,
	type CryptoPaymentStatus,
} from '@/types/payment';

// ==========================================
// Types
// ==========================================

export type HydratedCheckoutStep =
	| 'review'
	| 'confirming'
	| 'success'
	| 'failure';

export type ReviewSessionGuard =
	| { kind: 'ready' }
	| { kind: 'missing-session' }
	| { kind: 'wallet-changed' }
	| { kind: 'session-expired' };

export type PaySessionRevalidationDecision =
	| { kind: 'sendable' }
	| { kind: 'session-expired' }
	| { kind: 'rehydrate'; nextStep: HydratedCheckoutStep };

export type PolledTxHashSyncDecision =
	| { kind: 'noop' }
	| {
			kind: 'sync-backend-hash';
			normalizedBackendHash: string;
			adoptLocalTxHash?: `0x${string}`;
	  };

interface ReviewSessionGuardParams {
	connectedAddress: string | null;
	sessionWalletAddress: string | null;
	/** Backend-provided submit deadline — replaces raw expiresAt + FE grace math */
	submitDeadline: string | null | undefined;
	now?: number;
}

interface PaySessionRevalidationParams {
	status: CryptoPaymentStatus;
	/** Backend-provided submit deadline — replaces raw expiresAt + FE grace math */
	submitDeadline: string;
	now?: number;
}

interface PolledTxHashSyncParams {
	localTxHash: `0x${string}` | undefined;
	polledTxHash: string | null | undefined;
}

// ==========================================
// Helpers
// ==========================================

/**
 * Maps a backend crypto payment status to the FE checkout step that renders it.
 *
 * Centralised here so hydration and pay-time revalidation converge on the
 * same state machine instead of hand-encoding the status→step mapping in
 * multiple effects/handlers.
 *
 * @param status - Backend crypto payment status
 * @returns The FE checkout step corresponding to the backend status
 */
export function getHydratedCheckoutStep(
	status: CryptoPaymentStatus,
): HydratedCheckoutStep {
	switch (status) {
		case CRYPTO_PAYMENT_STATUS.CONFIRMING:
			return 'confirming';
		case CRYPTO_PAYMENT_STATUS.COMPLETED:
			return 'success';
		case CRYPTO_PAYMENT_STATUS.FAILED:
			return 'failure';
		case CRYPTO_PAYMENT_STATUS.PENDING:
		default:
			return 'review';
	}
}

/**
 * Checks whether the currently rendered review session is still safe to send.
 *
 * Why this guard exists:
 * - checkout sessions are bound to the verified sender wallet
 * - backend only accepts tx submission until the submit grace deadline
 * - if either assumption is stale, broadcasting funds first creates an
 *   irreversible on-chain transfer that backend may reject afterward
 */
export function getReviewSessionGuard({
	connectedAddress,
	sessionWalletAddress,
	submitDeadline,
	now = Date.now(),
}: ReviewSessionGuardParams): ReviewSessionGuard {
	if (!submitDeadline) return { kind: 'missing-session' };

	if (!connectedAddress || !sessionWalletAddress) {
		return { kind: 'wallet-changed' };
	}

	// Compare case-insensitively — both values should already be checksummed,
	// but we do not want formatting drift to bypass the wallet-binding guard.
	if (connectedAddress.toLowerCase() !== sessionWalletAddress.toLowerCase()) {
		return { kind: 'wallet-changed' };
	}

	// Backend-provided submit deadline — no FE grace computation needed
	if (now > new Date(submitDeadline).getTime()) {
		return { kind: 'session-expired' };
	}

	return { kind: 'ready' };
}

/**
 * Decides whether a freshly-read backend session may still be sent or must be
 * rehydrated back into an authoritative FE step.
 *
 * Pending is only sendable while backend would still accept a tx hash. Once the
 * status has advanced beyond pending, the FE must follow server truth instead of
 * guessing from stale local review state.
 */
export function getPaySessionRevalidationDecision({
	status,
	submitDeadline,
	now = Date.now(),
}: PaySessionRevalidationParams): PaySessionRevalidationDecision {
	if (status === CRYPTO_PAYMENT_STATUS.PENDING) {
		return now > new Date(submitDeadline).getTime()
			? { kind: 'session-expired' }
			: { kind: 'sendable' };
	}

	return {
		kind: 'rehydrate',
		nextStep: getHydratedCheckoutStep(status),
	};
}

/**
 * Mirrors backend tx-hash recovery from session polling into FE state.
 *
 * Polling owns whether backend has accepted a hash. The FE only adopts that
 * hash locally when it does not already have one; if a different local hash is
 * present we keep it so the replacement-mismatch guard can surface the conflict
 * instead of silently rewriting history.
 *
 * The polled hash is validated before casting to `0x${string}` — a malformed
 * backend response must not feed invalid data into wagmi hooks that expect
 * strict hex-prefixed hashes.
 */
export function getPolledTxHashSyncDecision({
	localTxHash,
	polledTxHash,
}: PolledTxHashSyncParams): PolledTxHashSyncDecision {
	if (!polledTxHash) return { kind: 'noop' };

	// Guard: reject malformed hashes from backend to prevent downstream wagmi errors.
	// In practice backend always stores normalized 0x + 64 hex, but we validate
	// defensively at the FE boundary.
	if (!isValidTxHash(polledTxHash)) return { kind: 'noop' };

	return {
		kind: 'sync-backend-hash',
		normalizedBackendHash: normalizeTxHash(polledTxHash),
		adoptLocalTxHash: localTxHash
			? undefined
			: (normalizeTxHash(polledTxHash) as `0x${string}`),
	};
}
