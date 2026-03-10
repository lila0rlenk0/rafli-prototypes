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

	// Crypto payment errors
	/** Wallet not verified for crypto checkout */
	CRYPTO_WALLET_NOT_VERIFIED: 'payments:crypto:wallet-not-verified',
	/** Raffle does not accept crypto payments */
	CRYPTO_RAFFLE_NOT_ACCEPTING: 'payments:crypto:raffle-not-accepting',
	/** Chain not supported for this raffle */
	CRYPTO_UNSUPPORTED_CHAIN: 'payments:crypto:unsupported-chain',
	/** Crypto checkout session expired */
	CRYPTO_SESSION_EXPIRED: 'payments:crypto:session-expired',
	/** Crypto payment already completed */
	CRYPTO_ALREADY_COMPLETED: 'payments:crypto:already-completed',
	/** Transaction hash already used */
	CRYPTO_TX_ALREADY_USED: 'payments:crypto:tx-already-used',
	/** Failed to submit crypto transaction */
	CRYPTO_SUBMIT_FAILED: 'payments:crypto:submit-failed',
	/** Crypto checkout session not found */
	CRYPTO_SESSION_NOT_FOUND: 'payments:crypto:session-not-found',
	/** Failed to create crypto checkout session */
	CRYPTO_CHECKOUT_FAILED: 'payments:crypto:checkout-failed',

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
