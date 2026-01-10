import type { CommonErrorCode } from './common-errors';
import type { OrderErrorCode } from './order-errors';

/**
 * Payment Error Codes
 *
 * Payment-specific error codes that match backend "payments:*" error codes
 */

export const PAYMENT_ERROR_CODES = {
	// Session errors
	/** Payment session not found */
	SESSION_NOT_FOUND: 'payments:session:not-found',
	/** User doesn't have permission to access this session */
	SESSION_PERMISSION_DENIED: 'payments:session:permission-denied',
	/** Payment session already completed */
	SESSION_ALREADY_COMPLETED: 'payments:session:already-completed',
	/** Payment session has expired */
	SESSION_EXPIRED: 'payments:session:expired',

	// Checkout errors
	/** Failed to create Stripe checkout session */
	CHECKOUT_FAILED: 'payments:checkout:failed',

	// Generic fetch failure
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Payment error code type
 */
export type PaymentErrorCode =
	| (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]
	| OrderErrorCode
	| CommonErrorCode;
