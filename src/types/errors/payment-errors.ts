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
	/** Stripe session completed during creation — race condition */
	CHECKOUT_CONCURRENT_COMPLETION: 'payments:checkout:concurrent-completion',

	// Order-level errors (shared across Stripe & crypto)
	/** Order not owned by current user */
	ORDER_PERMISSION_DENIED: 'payments:order:permission-denied',
	/** Order not in pending state — already completed/cancelled/failed */
	ORDER_NOT_PENDING: 'payments:order:not-pending',
	/** Stripe session already completed for this order */
	ORDER_ALREADY_PAID: 'payments:order:already-paid',

	// Cross-method guard errors
	/** Active crypto session blocks Stripe checkout — cancel crypto first */
	STRIPE_CRYPTO_SESSION_ACTIVE: 'payments:stripe:crypto-session-active',
	/** Active Stripe session blocks crypto checkout — cancel Stripe first */
	CRYPTO_STRIPE_SESSION_ACTIVE: 'payments:crypto:stripe-session-active',

	// Crypto payment errors
	/** Wallet not verified for crypto checkout */
	CRYPTO_WALLET_NOT_VERIFIED: 'payments:crypto:wallet-not-verified',
	/** Raffle does not accept crypto payments */
	CRYPTO_RAFFLE_NOT_ACCEPTING: 'payments:crypto:raffle-not-accepting',
	/** Chain not supported for crypto payments globally */
	CRYPTO_UNSUPPORTED_CHAIN: 'payments:crypto:unsupported-chain',
	/** Token identifier not in backend TOKEN_REGISTRY */
	CRYPTO_UNKNOWN_TOKEN: 'payments:crypto:unknown-token',
	/** Token exists but not deployed on the selected chain */
	CRYPTO_TOKEN_NOT_ON_CHAIN: 'payments:crypto:token-not-on-chain',
	/** Raffle restricts to specific chains and selected chain not in list */
	CRYPTO_CHAIN_NOT_ALLOWED: 'payments:crypto:chain-not-allowed',
	/** Raffle restricts to specific tokens and selected token not in list */
	CRYPTO_TOKEN_NOT_ALLOWED: 'payments:crypto:token-not-allowed',
	/** Non-stablecoin token missing price config on raffle */
	CRYPTO_NO_TOKEN_PRICING: 'payments:crypto:no-token-pricing',
	/** Crypto checkout session expired */
	CRYPTO_SESSION_EXPIRED: 'payments:crypto:session-expired',
	/** Crypto payment already completed */
	CRYPTO_ALREADY_COMPLETED: 'payments:crypto:already-completed',
	/** txHash already submitted and awaiting on-chain confirmation */
	CRYPTO_ALREADY_CONFIRMING: 'payments:crypto:already-confirming',
	/** Crypto session completed during upsert — race condition */
	CRYPTO_CONCURRENT_COMPLETION: 'payments:crypto:concurrent-completion',
	/** Transaction hash already used for a different payment */
	CRYPTO_TX_ALREADY_USED: 'payments:crypto:tx-already-used',
	/** Failed to submit crypto transaction */
	CRYPTO_SUBMIT_FAILED: 'payments:crypto:submit-failed',
	/** Failed to confirm crypto transaction (FE-driven finalization) */
	CRYPTO_CONFIRM_FAILED: 'payments:crypto:confirm-failed',
	/** Crypto checkout session not found */
	CRYPTO_SESSION_NOT_FOUND: 'payments:crypto:session-not-found',
	/** Failed to create crypto checkout session */
	CRYPTO_CHECKOUT_FAILED: 'payments:crypto:checkout-failed',
	/** Order failed/cancelled during pending phase — cannot recover */
	CRYPTO_ORDER_NOT_RECOVERABLE: 'payments:crypto:order-not-recoverable',
	/** Race: status changed between read and update */
	CRYPTO_CONCURRENT_UPDATE: 'payments:crypto:concurrent-update',
	/** chainId in confirm request doesn't match session's stored chain */
	CRYPTO_CHAIN_MISMATCH: 'payments:crypto:chain-mismatch',
	/** Crypto session not owned by requesting user */
	CRYPTO_PERMISSION_DENIED: 'payments:crypto:permission-denied',
	/** Crypto payment already paid (duplicate of already-completed for session context) */
	CRYPTO_ALREADY_PAID: 'payments:crypto:already-paid',
	/** User hit per-raffle ticket cap */
	RAFFLE_USER_TICKET_LIMIT_EXCEEDED:
		'payments:raffle:user-ticket-limit-exceeded',

	// Cancel session errors
	/** Cannot cancel crypto session — tx is on-chain awaiting confirmation */
	CANCEL_CRYPTO_CONFIRMING: 'payments:cancel:crypto-confirming',
	/** Failed to cancel payment session (response validation) */
	CANCEL_SESSION_FAILED: 'payments:cancel:session-failed',

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
