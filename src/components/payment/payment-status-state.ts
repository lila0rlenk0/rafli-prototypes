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
 * Only explicit backend `unpaid` responses keep the polling loop alive.
 * Any transport/auth/ownership failure is terminal for this attempt because
 * continuing to render "processing" would be dishonest and can loop forever.
 */
export function resolveStripeVerificationState(
	result: ServiceResponse<StripeSessionStatus, PaymentErrorCode>,
): StripeVerificationState {
	if (result.success) {
		return {
			status: result.data.status,
			errorCode: null,
			shouldPoll: result.data.status === 'unpaid',
		};
	}

	return {
		status: 'verification-failed',
		errorCode: result.error,
		shouldPoll: false,
	};
}

/**
 * Maps verification failures to actionable recovery copy.
 *
 * Separate auth recovery from retryable transport errors so the modal can offer
 * the right next action instead of a generic dead end.
 */
export function getStripeVerificationFailureCopy(
	error: PaymentErrorCode | null,
): StripeVerificationFailureCopy {
	switch (error) {
		case COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED:
		case COMMON_ERROR_CODES.UNAUTHORIZED:
		case COMMON_ERROR_CODES.SESSION_EXPIRED:
			return {
				title: 'Sign in to verify payment',
				description:
					'Your session expired before we could verify this checkout. Sign in again and we will return you to this payment status screen.',
				canRetry: false,
				requiresSignIn: true,
			};
		case PAYMENT_ERROR_CODES.STRIPE_PERMISSION_DENIED:
		case PAYMENT_ERROR_CODES.STRIPE_SESSION_NOT_FOUND:
		case COMMON_ERROR_CODES.FORBIDDEN:
			return {
				title: 'Unable to verify this checkout',
				description:
					'This Stripe session does not belong to your account or is no longer available. No additional charge will be created here.',
				canRetry: false,
				requiresSignIn: false,
			};
		case PAYMENT_ERROR_CODES.FETCH_FAILED:
		case COMMON_ERROR_CODES.NETWORK_ERROR:
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
		case COMMON_ERROR_CODES.CONNECTION_ABORTED:
		case COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR:
		case COMMON_ERROR_CODES.SERVICE_UNAVAILABLE:
		case COMMON_ERROR_CODES.UNKNOWN_ERROR:
			return {
				title: 'Payment verification unavailable',
				description:
					'We could not verify Stripe right now. Your payment may still complete. Try verification again in a moment or check My Raffles.',
				canRetry: true,
				requiresSignIn: false,
			};
		default:
			return {
				title: 'Payment verification failed',
				description:
					'We could not verify this Stripe checkout from the current session. Please try again or check My Raffles shortly.',
				canRetry: true,
				requiresSignIn: false,
			};
	}
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
