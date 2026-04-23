import type {
	CheckoutOrderErrorCode,
	PaymentErrorCode,
	WalletErrorCode,
} from '@/types/errors';

// ==========================================
// Order Error Messages
// ==========================================

/**
 * Lookup table — order error code → user-facing message. Missing keys
 * fall back to the generic "failed" copy in `getOrderErrorMessage`.
 */
const ORDER_ERROR_MESSAGES: Partial<Record<CheckoutOrderErrorCode, string>> = {
	'core:raffle:not-active': 'This sweepstakes is not currently active',
	'core:raffle:sold-out': 'Not enough entries available',
	'core:raffle:user-ticket-limit-exceeded':
		'You reached the maximum entries per user for this sweepstakes',
	// "Order already paid / completed" surfaces as `payments:order:already-paid`
	// — see payment error messages. The old `core:order:already-completed` URN
	// is never emitted by the backend.
	network_error: 'Network error. Please check your connection',
	timeout_error: 'Request timed out. Please try again',
	'core:order:question-not-answered':
		'Please answer the required question before purchasing',
	'core:raffle:not-found': 'Sweepstakes not found',
	'core:order:not-found': 'Order not found',
	'global:auth:unauthenticated': 'Please sign in to continue',
	unauthorized: 'Please sign in to continue',
};

/**
 * Maps order error codes to user-friendly messages.
 * Shared between card and crypto checkout flows.
 *
 * @param errorCode - Order or checkout error code from checkoutOrder service action
 * @returns Human-readable error string for toast/UI display
 */
export function getOrderErrorMessage(
	errorCode: CheckoutOrderErrorCode,
): string {
	return (
		ORDER_ERROR_MESSAGES[errorCode] ??
		'Failed to create order. Please try again'
	);
}

// ==========================================
// Payment Error Messages
// ==========================================

/**
 * Lookup table — payment error code → user-facing message. Covers
 * Stripe + crypto + credits flows; all surfaced from the atomic
 * checkout service. Duplicates across branches (e.g. `core:order:…`)
 * map to the same copy because the user only cares about the outcome.
 */
const PAYMENT_ERROR_MESSAGES: Partial<Record<PaymentErrorCode, string>> = {
	// Session errors
	'payments:crypto:session-not-found':
		'Payment session not found. Please start a new checkout',
	'payments:crypto:session-expired':
		'Checkout session expired. Please try again',
	'payments:crypto:permission-denied':
		'You do not have access to this payment session',
	'payments:crypto:already-completed': 'This order has already been paid',
	'payments:order:already-paid': 'This order has already been paid',
	// Cross-method guard errors — backend auto-cancels, but may still
	// surface if the incompatible session is in a non-cancellable state
	// (e.g. confirming).
	'payments:stripe:crypto-session-active':
		'A crypto payment is in progress. Please wait for it to complete',
	'payments:crypto:stripe-session-active':
		'A card payment is in progress. Please wait for it to complete',
	// Crypto checkout errors
	'payments:crypto:wallet-not-verified': 'Please verify your wallet first',
	'payments:crypto:raffle-not-accepting':
		'This sweepstakes does not accept crypto payments',
	'payments:crypto:unsupported-chain':
		'Selected network is not supported for this sweepstakes',
	'payments:crypto:chain-not-allowed':
		'Selected network is not supported for this sweepstakes',
	'payments:crypto:unknown-token':
		'Selected token is not available on this network',
	'payments:crypto:token-not-on-chain':
		'Selected token is not available on this network',
	'payments:crypto:token-not-allowed':
		'Selected token is not accepted for this sweepstakes',
	'payments:crypto:no-token-pricing':
		'This token does not have pricing configured for this sweepstakes',
	'payments:crypto:wallet-mismatch':
		'Connected wallet does not match your verified wallet',
	'payments:crypto:invalid-tx-hash': 'Invalid transaction hash format',
	'payments:crypto:tx-already-used':
		'This transaction was already used for another payment. Please start a new checkout',
	'payments:crypto:already-confirming':
		'Transaction already submitted and awaiting confirmation',
	'payments:crypto:submit-failed':
		'Failed to verify transaction. Please contact support',
	'payments:crypto:chain-mismatch':
		'Chain mismatch — please retry with the correct network',
	'payments:crypto:already-paid': 'This order has already been paid',
	'payments:crypto:order-not-recoverable':
		'This order can no longer be paid. Please create a new one',
	'payments:crypto:concurrent-completion':
		'Payment status changed. Please refresh and try again',
	'payments:crypto:concurrent-update':
		'Payment status changed. Please refresh and try again',
	'payments:checkout:concurrent-completion':
		'Payment status changed. Please refresh and try again',
	'payments:raffle:user-ticket-limit-exceeded':
		'You reached the maximum entries per user for this sweepstakes',
	// Stripe session errors
	'payments:stripe:permission-denied':
		'You do not have access to this checkout session',
	'payments:stripe:session-not-found':
		'Checkout session not found. Please start a new checkout',
	// Checkout/confirm failures
	'payments:checkout:failed':
		'Failed to create checkout session. Please try again',
	'payments:checkout:not-found':
		'Checkout session not found. Please start a new checkout',
	'payments:crypto:confirm-failed':
		'Failed to confirm transaction. Please contact support',
	fetch_failed: 'Failed to load payment data. Please try again',
	// Abandon errors
	'payments:abandon:crypto-active':
		'Cannot close checkout while a crypto transaction is in progress',
	// Wallet pre-flight errors (from atomic crypto checkout)
	'payments:crypto:invalid-wallet':
		'Wallet address is invalid or not linked to your account',
	'payments:crypto:treasury-not-configured':
		'Crypto payments are temporarily unavailable for this network. Please try another',
	'payments:crypto:zero-amount': 'Order amount is zero — no payment needed',
	// Order errors (surfaced by atomic crypto checkout which creates orders internally)
	'payments:order:permission-denied': 'You do not have access to this order',
	'core:order:permission-denied': 'You do not have access to this order',
	'payments:order:not-pending': 'This order is no longer pending',
	'core:order:not-found': 'Order not found',
	'core:raffle:not-found': 'Sweepstakes not found',
	'core:raffle:sold-out': 'Not enough entries available',
	'core:raffle:not-active': 'This sweepstakes is not currently active',
	'core:raffle:user-ticket-limit-exceeded':
		'You reached the maximum entries per user for this sweepstakes',
	'core:order:question-not-answered':
		'Please answer the required question before purchasing',
	// Auth errors — from CommonErrorCode union
	'global:auth:unauthenticated': 'Please sign in to continue',
	unauthorized: 'Please sign in to continue',
	// Credit payment errors
	'payments:credits:insufficient-balance':
		"You don't have enough credits for this purchase",
	'payments:credits:order-not-found': 'Order not found',
	'payments:credits:order-not-pending':
		'This order is no longer available for payment',
	'payments:credits:invalid-amount': 'Invalid order amount for credit payment',
	'payments:credits:invalid-order-amount':
		'Invalid order amount for credit payment',
	'payments:credits:payment-session-active':
		'A pending payment session exists. Please wait for it to expire or try again',
	// Common errors
	network_error: 'Network error. Please check your connection',
	timeout_error: 'Request timed out. Please try again',
	connection_aborted: 'Connection lost. Check your network and try again.',
	service_unavailable:
		'Service temporarily unavailable. Please try again shortly.',
	validation_error: 'Invalid request. Please try again',
};

/**
 * Maps payment error codes to user-friendly messages.
 * Shared between Stripe and crypto checkout flows.
 *
 * @param errorCode - Payment error code from any payment service action
 * @returns Human-readable error string for toast/UI display
 */
export function getPaymentErrorMessage(errorCode: PaymentErrorCode): string {
	return (
		PAYMENT_ERROR_MESSAGES[errorCode] ??
		'Failed to start checkout. Please try again'
	);
}

/**
 * Polling may surface raw backend diagnostics in `failureReason` — only show
 * allowlisted error-code copy; never echo arbitrary server strings (info leak / XSS in UI).
 */
export function mapPolledCryptoFailureReasonToUserMessage(
	reason: string | null | undefined,
	fallback: string,
): string {
	if (reason == null || String(reason).trim() === '') return fallback;
	const t = String(reason).trim() as PaymentErrorCode;
	const mapped = PAYMENT_ERROR_MESSAGES[t];
	// `undefined` = not a known code — generic copy only (injection / internal text mitigated)
	return mapped !== undefined ? mapped : fallback;
}

// ==========================================
// Wallet Error Messages
// ==========================================

/** Lookup — wallet error code → user-facing copy. */
const WALLET_ERROR_MESSAGES: Partial<Record<WalletErrorCode, string>> = {
	'auth:wallet:not-verified': 'Wallet is not verified. Please verify first',
	'auth:wallet:signature-invalid':
		'Signature verification failed. Please try again',
	'auth:wallet:invalid-signature': 'Invalid wallet signature. Please try again',
	'auth:wallet:signature-expired':
		'Signature expired. Please sign a new message',
	'auth:wallet:invalid-timestamp':
		'Wallet verification expired. Please sign a fresh message',
	'auth:wallet:limit-reached':
		'Maximum linked wallets reached. Unlink one to add another',
	'auth:wallet:message-mismatch':
		'Signed message does not match expected format. Please try again',
	'auth:wallet:invalid-address': 'Invalid wallet address format',
	'auth:wallet:not-found': 'Wallet not found on your account',
	'auth:wallet:validation-failed':
		'Wallet verification response was invalid. Please try again',
	fetch_failed: 'Failed to load wallet data. Please try again',
	network_error: 'Network error. Please check your connection',
	timeout_error: 'Request timed out. Please try again',
};

/**
 * Maps wallet error codes to user-friendly messages.
 * Used across wallet verification, linking, and unlinking flows.
 *
 * @param errorCode - Wallet error code from verifyWallet/getWallets service actions
 * @returns Human-readable error string for toast/UI display
 */
export function getWalletErrorMessage(errorCode: WalletErrorCode): string {
	return (
		WALLET_ERROR_MESSAGES[errorCode] ??
		'Wallet operation failed. Please try again'
	);
}

// ==========================================
// Promo Code Error Messages
// ==========================================

/** Lookup — promo error code → user-facing copy. */
const PROMO_ERROR_MESSAGES: Record<string, string> = {
	'core:promo:not-found': 'Promo code not found',
	'core:promo:expired': 'This promo code has expired',
	'core:promo:max-uses-reached': 'This promo code has reached its usage limit',
	'core:promo:deactivated': 'This promo code is no longer active',
	'core:promo:already-redeemed': 'You already used this promo code',
	'core:promo:host-cannot-redeem':
		'You cannot use codes on your own sweepstakes',
	'core:promo:raffle-mismatch': 'This code is not valid for this sweepstakes',
	'core:promo:order-already-discounted': 'This order already has a promo code',
	'core:promo:question-required': 'Please answer the question first',
	'core:raffle:not-live': 'This sweepstakes is not currently active',
	'core:order:not-found': 'Order not found',
	'core:order:not-pending': 'This order can no longer be updated',
	'core:order:permission-denied': 'You do not have access to this order',
	'global:validation:invalid-argument': 'Invalid promo code request',
	invalid_code: 'Invalid promo code request',
	validation_error: 'Invalid promo code request',
	'global:auth:unauthenticated': 'Please sign in to continue',
	unauthorized: 'Please sign in to continue',
	network_error: 'Network error. Please check your connection',
	timeout_error: 'Request timed out. Please try again',
};

/**
 * Maps promo code error codes to user-friendly messages.
 * Shared between card and crypto checkout flows.
 *
 * @param errorCode - Promo error code string from redeemPromoCode service action
 * @returns Human-readable error string for toast/UI display
 */
export function getPromoErrorMessage(errorCode: string): string {
	return (
		PROMO_ERROR_MESSAGES[errorCode] ?? 'Failed to redeem code. Please try again'
	);
}

/**
 * Promo codes that represent a deterministic business rejection — any
 * of these should clear the input since the user would need to enter a
 * different code, not retry the same one.
 */
const CLEARABLE_PROMO_ERRORS = new Set<string>([
	'core:promo:not-found',
	'core:promo:expired',
	'core:promo:max-uses-reached',
	'core:promo:deactivated',
	'core:promo:already-redeemed',
	'core:promo:host-cannot-redeem',
	'core:promo:raffle-mismatch',
	'core:promo:order-already-discounted',
	'global:validation:invalid-argument',
	'invalid_code',
]);

/**
 * Determines if promo should be cleared from UI after an error.
 * Only clear for deterministic business errors, not transient network issues.
 *
 * @param errorCode - Error code from a failed promo redemption attempt
 * @returns True if the promo input should be cleared (invalid code), false if retryable
 */
export function shouldClearPromo(errorCode: string): boolean {
	return CLEARABLE_PROMO_ERRORS.has(errorCode);
}
