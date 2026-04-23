import type { StripeSessionStatus } from '@/services/payment/get-stripe-session-status';
import {
	COMMON_ERROR_CODES,
	PAYMENT_ERROR_CODES,
	type PaymentErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Types
// ==========================================

/** Verified payment status from backend — `loading` and `verification-failed` are FE-only */
export type VerifiedStatus =
	| 'loading'
	| 'paid'
	| 'unpaid'
	| 'expired'
	| 'verification-failed';

interface StripeVerificationFailureCopy {
	description: string;
	title: string;
	canRetry: boolean;
	requiresSignIn: boolean;
}

interface StripeVerificationState {
	status: VerifiedStatus;
	errorCode: PaymentErrorCode | null;
	shouldPoll: boolean;
}

// ==========================================
// Helpers
// ==========================================

/**
 * Converts a single verification attempt into UI state.
 *
 * `unpaid` and `expired` keep the polling loop alive:
 * - `unpaid`: payment not yet received — standard polling reason.
 * - `expired`: Stripe session expired, but the Stripe `checkout.session.completed`
 *   webhook can still arrive after expiry (cancel-race recovery). If the webhook
 *   lands, backend transitions the order to `completed`. Stopping the poll here
 *   would hide that recovery from the user — they'd see "expired" permanently
 *   even though their payment succeeded seconds later.
 *
 * `paid` is terminal-success; any transport/auth failure is terminal-error.
 */
export function resolveStripeVerificationState(
	result: ServiceResponse<StripeSessionStatus, PaymentErrorCode>,
): StripeVerificationState {
	if (!result.success) {
		return {
			status: 'verification-failed',
			errorCode: result.error,
			shouldPoll: false,
		};
	}

	/** Keep polling for unpaid (awaiting payment) and expired (cancel-race recovery window) */
	const shouldPoll =
		result.data.status === 'unpaid' || result.data.status === 'expired';
	return {
		status: result.data.status,
		errorCode: null,
		shouldPoll,
	};
}

const AUTH_RECOVERY_ERRORS = new Set<PaymentErrorCode>([
	COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED,
	COMMON_ERROR_CODES.UNAUTHORIZED,
	COMMON_ERROR_CODES.SESSION_EXPIRED,
]);

const NOT_FOUND_OR_FORBIDDEN_ERRORS = new Set<PaymentErrorCode>([
	PAYMENT_ERROR_CODES.STRIPE_PERMISSION_DENIED,
	PAYMENT_ERROR_CODES.STRIPE_SESSION_NOT_FOUND,
	COMMON_ERROR_CODES.FORBIDDEN,
]);

const TRANSPORT_RETRY_ERRORS = new Set<PaymentErrorCode>([
	PAYMENT_ERROR_CODES.FETCH_FAILED,
	COMMON_ERROR_CODES.NETWORK_ERROR,
	COMMON_ERROR_CODES.TIMEOUT_ERROR,
	COMMON_ERROR_CODES.CONNECTION_ABORTED,
	COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
	COMMON_ERROR_CODES.SERVICE_UNAVAILABLE,
	COMMON_ERROR_CODES.UNKNOWN_ERROR,
]);

/**
 * Maps verification failures to actionable recovery copy.
 *
 * Separate auth recovery from retryable transport errors so the modal can offer
 * the right next action instead of a generic dead end.
 */
export function getStripeVerificationFailureCopy(
	error: PaymentErrorCode | null,
): StripeVerificationFailureCopy {
	if (error && AUTH_RECOVERY_ERRORS.has(error)) {
		return {
			title: 'Sign in to verify payment',
			description:
				'Your session expired before we could verify this checkout. Sign in again and we will return you to this payment status screen.',
			canRetry: false,
			requiresSignIn: true,
		};
	}
	if (error && NOT_FOUND_OR_FORBIDDEN_ERRORS.has(error)) {
		return {
			title: 'Unable to verify this checkout',
			description:
				'This Stripe session does not belong to your account or is no longer available. No additional charge will be created here.',
			canRetry: false,
			requiresSignIn: false,
		};
	}
	if (error && TRANSPORT_RETRY_ERRORS.has(error)) {
		return {
			title: 'Payment verification unavailable',
			description:
				'We could not verify Stripe right now. Your payment may still complete. Try verification again in a moment or check My Sweepstakes.',
			canRetry: true,
			requiresSignIn: false,
		};
	}
	return {
		title: 'Payment verification failed',
		description:
			'We could not verify this Stripe checkout from the current session. Please try again or check My Sweepstakes shortly.',
		canRetry: true,
		requiresSignIn: false,
	};
}

/**
 * Preserves the Stripe redirect params through sign-in recovery.
 */
export function buildStripeVerificationReturnTo(
	publicSlug: string,
	stripeSessionId: string,
): string {
	return `/browse/${encodeURIComponent(publicSlug)}?session_id=${encodeURIComponent(stripeSessionId)}`;
}
