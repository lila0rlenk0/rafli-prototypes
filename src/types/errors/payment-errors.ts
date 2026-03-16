import type { CommonErrorCode } from './common-errors';
import type { OrderErrorCode } from './order-errors';

/**
 * Payment Error Codes
 *
 * Payment-specific error codes matching BE "payments:*" error responses.
 * Covers both Stripe and crypto checkout flows.
 *
 * PaymentErrorCode union includes OrderErrorCode + CommonErrorCode because
 * payment service actions can surface order-level errors (e.g. order not found)
 * and transport-level errors (e.g. network timeout) alongside payment-specific ones.
 */

export const PAYMENT_ERROR_CODES = {
	// Checkout errors
	/** Failed to create Stripe checkout session */
	CHECKOUT_FAILED: 'payments:checkout:failed',
	/** Checkout session not found — order may have been cancelled or never created */
	CHECKOUT_NOT_FOUND: 'payments:checkout:not-found',
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
	/** Stripe session does not belong to current user */
	STRIPE_PERMISSION_DENIED: 'payments:stripe:permission-denied',
	/** Stripe session ID is unknown */
	STRIPE_SESSION_NOT_FOUND: 'payments:stripe:session-not-found',
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
	/** Crypto payment already completed — returned by submit/confirm endpoints when session is done */
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
	/** Order failed/cancelled during pending phase — cannot recover */
	CRYPTO_ORDER_NOT_RECOVERABLE: 'payments:crypto:order-not-recoverable',
	/** Race: status changed between read and update */
	CRYPTO_CONCURRENT_UPDATE: 'payments:crypto:concurrent-update',
	/** chainId in confirm request doesn't match session's stored chain */
	CRYPTO_CHAIN_MISMATCH: 'payments:crypto:chain-mismatch',
	/** Crypto session not owned by requesting user */
	CRYPTO_PERMISSION_DENIED: 'payments:crypto:permission-denied',
	/** Crypto payment already paid — returned by atomic-checkout when order already has a completed session */
	CRYPTO_ALREADY_PAID: 'payments:crypto:already-paid',
	/** Connected wallet doesn't match session's stored wallet address */
	CRYPTO_WALLET_MISMATCH: 'payments:crypto:wallet-mismatch',
	/** Transaction hash fails BE format validation */
	CRYPTO_INVALID_TX_HASH: 'payments:crypto:invalid-tx-hash',
	/** User hit per-raffle ticket cap */
	RAFFLE_USER_TICKET_LIMIT_EXCEEDED:
		'payments:raffle:user-ticket-limit-exceeded',

	// Abandon errors
	/** Cannot abandon order while crypto tx is confirming or submitted */
	ABANDON_CRYPTO_ACTIVE: 'payments:abandon:crypto-active',

	// Wallet errors (from atomic crypto checkout pre-flight)
	/** Wallet address format invalid or not found in backend wallet registry */
	CRYPTO_INVALID_WALLET: 'payments:crypto:invalid-wallet',

	// Internal server guards — normally unreachable from FE but kept for type exhaustiveness.
	// If surfaced, mapPaymentError maps them to generic codes; these constants exist so
	// any future explicit handling can reference them without magic strings.
	/** Stripe amount fails backend format validation */
	AMOUNT_INVALID_FORMAT: 'payments:amount:invalid-format',
	/** Stripe amount exceeds backend ceiling */
	AMOUNT_TOO_LARGE: 'payments:amount:too-large',
	/** Crypto amount scaling produced invalid result */
	CRYPTO_INVALID_AMOUNT_FORMAT: 'payments:crypto:invalid-amount-format',
	/** Crypto token price format invalid on raffle config */
	CRYPTO_INVALID_PRICE_FORMAT: 'payments:crypto:invalid-price-format',
	/** Crypto ticket quantity out of valid range */
	CRYPTO_INVALID_TICKET_QUANTITY: 'payments:crypto:invalid-ticket-quantity',
	/** Crypto computed amount is zero (should not happen after promo check) */
	CRYPTO_ZERO_AMOUNT: 'payments:crypto:zero-amount',

	// Generic fetch failure — used when Zod parse fails on response (schema mismatch)
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Union of all error codes that payment service actions can return.
 * Includes payment-specific codes, order-level codes, and common transport errors.
 */
export type PaymentErrorCode =
	| (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]
	| OrderErrorCode
	| CommonErrorCode;
