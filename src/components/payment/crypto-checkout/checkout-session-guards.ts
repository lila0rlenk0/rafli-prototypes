import { getCryptoSessionGraceDeadline } from '@/lib/web3/crypto-payment-flow';
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

export type CheckoutHydrationDecision =
	| { kind: 'review-fallback' }
	| { kind: 'confirming-recovery' }
	| { kind: 'apply-server-state'; nextStep: HydratedCheckoutStep };

interface ReviewSessionGuardParams {
	connectedAddress: string | null;
	sessionWalletAddress: string | null;
	expiresAt: string | null | undefined;
	now?: number;
}

interface PaySessionRevalidationParams {
	status: CryptoPaymentStatus;
	expiresAt: string;
	now?: number;
}

/**
 * Discriminated union ensures `serverStatus` is required when the session read
 * succeeded — prevents callers from passing `{ sessionReadSucceeded: true }`
 * without the status and hitting a runtime throw.
 */
type CheckoutHydrationDecisionParams =
	| {
			allowReviewFallback: boolean;
			sessionReadSucceeded: false;
			serverStatus?: undefined;
	  }
	| {
			allowReviewFallback: boolean;
			sessionReadSucceeded: true;
			serverStatus: CryptoPaymentStatus;
	  };

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
	expiresAt,
	now = Date.now(),
}: ReviewSessionGuardParams): ReviewSessionGuard {
	if (!expiresAt) return { kind: 'missing-session' };

	if (!connectedAddress || !sessionWalletAddress) {
		return { kind: 'wallet-changed' };
	}

	// Compare case-insensitively — both values should already be checksummed,
	// but we do not want formatting drift to bypass the wallet-binding guard.
	if (connectedAddress.toLowerCase() !== sessionWalletAddress.toLowerCase()) {
		return { kind: 'wallet-changed' };
	}

	// Pending review sessions stay sendable through backend's submit grace window,
	// not just until the raw checkout TTL.
	const submitDeadline = getCryptoSessionGraceDeadline(expiresAt, 'submit');
	if (now > submitDeadline) {
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
	expiresAt,
	now = Date.now(),
}: PaySessionRevalidationParams): PaySessionRevalidationDecision {
	if (status === CRYPTO_PAYMENT_STATUS.PENDING) {
		const submitDeadline = getCryptoSessionGraceDeadline(expiresAt, 'submit');
		return now > submitDeadline
			? { kind: 'session-expired' }
			: { kind: 'sendable' };
	}

	return {
		kind: 'rehydrate',
		nextStep: getHydratedCheckoutStep(status),
	};
}

/**
 * Resolves how checkout hydration should behave when the follow-up session read
 * succeeds or fails.
 *
 * Two failure modes matter:
 * - newly-created pending session: local review fallback is safe
 * - recovering already-confirming session: stay in confirming and let polling
 *   recover the authoritative backend state instead of terminally failing
 */
export function resolveCheckoutHydrationDecision({
	allowReviewFallback,
	serverStatus,
	sessionReadSucceeded,
}: CheckoutHydrationDecisionParams): CheckoutHydrationDecision {
	if (!sessionReadSucceeded) {
		return allowReviewFallback
			? { kind: 'review-fallback' }
			: { kind: 'confirming-recovery' };
	}

	return {
		kind: 'apply-server-state',
		nextStep: getHydratedCheckoutStep(serverStatus),
	};
}
