import type {
	OrderErrorCode,
	PaymentErrorCode,
	WalletErrorCode,
} from '@/types/errors';

// ==========================================
// Order Error Messages
// ==========================================

/**
 * Maps order error codes to user-friendly messages.
 * Shared between card and crypto checkout flows.
 *
 * @param errorCode - Order error code from checkoutOrder service action
 * @returns Human-readable error string for toast/UI display
 */
export function getOrderErrorMessage(errorCode: OrderErrorCode): string {
	switch (errorCode) {
		case 'core:raffle:not-active':
			return 'This raffle is not currently active';
		case 'core:raffle:sold-out':
			return 'Not enough tickets available';
		case 'core:order:invalid-quantity':
			return 'Invalid ticket quantity';
		case 'core:raffle:user-ticket-limit-exceeded':
			return 'You reached the maximum tickets per user for this raffle';
		case 'core:order:already-completed':
			return 'This order has already been completed.';
		case 'network_error':
			return 'Network error. Please check your connection';
		case 'timeout_error':
			return 'Request timed out. Please try again';
		case 'core:order:question-not-answered':
			return 'Please answer the required question before purchasing';
		case 'core:raffle:not-found':
			return 'Raffle not found';
		case 'core:order:not-found':
			return 'Order not found';
		case 'global:auth:unauthenticated':
		case 'unauthorized':
			return 'Please sign in to continue';
		default:
			return 'Failed to create order. Please try again';
	}
}

// ==========================================
// Payment Error Messages
// ==========================================

/**
 * Maps payment error codes to user-friendly messages.
 * Shared between Stripe and crypto checkout flows.
 *
 * @param errorCode - Payment error code from any payment service action
 * @returns Human-readable error string for toast/UI display
 */
export function getPaymentErrorMessage(errorCode: PaymentErrorCode): string {
	switch (errorCode) {
		// Session errors
		case 'payments:crypto:session-not-found':
			return 'Payment session not found. Please start a new checkout';
		case 'payments:crypto:session-expired':
			return 'Checkout session expired. Please try again';
		case 'payments:crypto:permission-denied':
			return 'You do not have access to this payment session';
		case 'payments:crypto:already-completed':
		case 'payments:order:already-paid':
			return 'This order has already been paid';

		// Cross-method guard errors — backend auto-cancels, but may still surface these
		// if the incompatible session is in a non-cancellable state (e.g. confirming)
		case 'payments:stripe:crypto-session-active':
			return 'A crypto payment is in progress. Please wait for it to complete';
		case 'payments:crypto:stripe-session-active':
			return 'A card payment is in progress. Please wait for it to complete';

		// Crypto checkout errors
		case 'payments:crypto:wallet-not-verified':
			return 'Please verify your wallet first';
		case 'payments:crypto:raffle-not-accepting':
			return 'This raffle does not accept crypto payments';
		case 'payments:crypto:unsupported-chain':
		case 'payments:crypto:chain-not-allowed':
			return 'Selected network is not supported for this raffle';
		case 'payments:crypto:unknown-token':
		case 'payments:crypto:token-not-on-chain':
			return 'Selected token is not available on this network';
		case 'payments:crypto:token-not-allowed':
			return 'Selected token is not accepted for this raffle';
		case 'payments:crypto:no-token-pricing':
			return 'This token does not have pricing configured for this raffle';
		case 'payments:crypto:wallet-mismatch':
			return 'Connected wallet does not match your verified wallet';
		case 'payments:crypto:invalid-tx-hash':
			return 'Invalid transaction hash format';
		case 'payments:crypto:tx-already-used':
			return 'This transaction was already used for another payment. Please start a new checkout';
		case 'payments:crypto:already-confirming':
			return 'Transaction already submitted and awaiting confirmation';
		case 'payments:crypto:submit-failed':
			return 'Failed to verify transaction. Please contact support';
		case 'payments:crypto:chain-mismatch':
			return 'Chain mismatch — please retry with the correct network';
		case 'payments:crypto:already-paid':
			return 'This order has already been paid';
		case 'payments:crypto:order-not-recoverable':
			return 'This order can no longer be paid. Please create a new one';
		case 'payments:crypto:concurrent-completion':
		case 'payments:crypto:concurrent-update':
		case 'payments:checkout:concurrent-completion':
			return 'Payment status changed. Please refresh and try again';
		case 'payments:raffle:user-ticket-limit-exceeded':
			return 'You reached the maximum tickets per user for this raffle';

		// Stripe session errors
		case 'payments:stripe:permission-denied':
			return 'You do not have access to this checkout session';
		case 'payments:stripe:session-not-found':
			return 'Checkout session not found. Please start a new checkout';

		// Checkout/confirm failures
		case 'payments:checkout:failed':
			return 'Failed to create checkout session. Please try again';
		case 'payments:checkout:not-found':
			return 'Checkout session not found. Please start a new checkout';
		case 'payments:crypto:confirm-failed':
			return 'Failed to confirm transaction. Please contact support';
		case 'fetch_failed':
			return 'Failed to load payment data. Please try again';

		// Abandon errors
		case 'payments:abandon:crypto-active':
			return 'Cannot close checkout while a crypto transaction is in progress';

		// Wallet pre-flight errors (from atomic crypto checkout)
		case 'payments:crypto:invalid-wallet':
			return 'Wallet address is invalid or not linked to your account';

		// Order errors
		case 'payments:order:permission-denied':
		case 'core:order:permission-denied':
			return 'You do not have access to this order';
		case 'payments:order:not-pending':
			return 'This order is no longer pending';
		case 'core:order:not-found':
			return 'Order not found';
		case 'core:raffle:not-found':
			return 'Raffle not found';

		// Auth errors — from CommonErrorCode union
		case 'global:auth:unauthenticated':
		case 'unauthorized':
			return 'Please sign in to continue';

		// Common errors
		case 'network_error':
			return 'Network error. Please check your connection';
		case 'timeout_error':
			return 'Request timed out. Please try again';
		case 'connection_aborted':
			return 'Connection lost. Check your network and try again.';
		case 'service_unavailable':
			return 'Service temporarily unavailable. Please try again shortly.';
		case 'validation_error':
			return 'Invalid request. Please try again';
		default:
			return 'Failed to start checkout. Please try again';
	}
}

// ==========================================
// Wallet Error Messages
// ==========================================

/**
 * Maps wallet error codes to user-friendly messages.
 * Used across wallet verification, linking, and unlinking flows.
 *
 * @param errorCode - Wallet error code from verifyWallet/getWallets service actions
 * @returns Human-readable error string for toast/UI display
 */
export function getWalletErrorMessage(errorCode: WalletErrorCode): string {
	switch (errorCode) {
		case 'auth:wallet:not-verified':
			return 'Wallet is not verified. Please verify first';
		case 'auth:wallet:signature-invalid':
			return 'Signature verification failed. Please try again';
		case 'auth:wallet:invalid-signature':
			return 'Invalid wallet signature. Please try again';
		case 'auth:wallet:signature-expired':
			return 'Signature expired. Please sign a new message';
		case 'auth:wallet:invalid-timestamp':
			return 'Wallet verification expired. Please sign a fresh message';
		case 'auth:wallet:limit-reached':
			return 'Maximum linked wallets reached. Unlink one to add another';
		case 'auth:wallet:message-mismatch':
			return 'Signed message does not match expected format. Please try again';
		case 'auth:wallet:invalid-address':
			return 'Invalid wallet address format';
		case 'auth:wallet:not-found':
			return 'Wallet not found on your account';
		case 'auth:wallet:validation-failed':
			return 'Wallet verification response was invalid. Please try again';
		case 'fetch_failed':
			return 'Failed to load wallet data. Please try again';
		case 'network_error':
			return 'Network error. Please check your connection';
		case 'timeout_error':
			return 'Request timed out. Please try again';
		default:
			return 'Wallet operation failed. Please try again';
	}
}

// ==========================================
// Promo Code Error Messages
// ==========================================

/**
 * Maps promo code error codes to user-friendly messages.
 * Shared between card and crypto checkout flows.
 *
 * @param errorCode - Promo error code string from redeemPromoCode service action
 * @returns Human-readable error string for toast/UI display
 */
export function getPromoErrorMessage(errorCode: string): string {
	switch (errorCode) {
		case 'core:promo:not-found':
			return 'Promo code not found';
		case 'core:promo:expired':
			return 'This promo code has expired';
		case 'core:promo:max-uses-reached':
			return 'This promo code has reached its usage limit';
		case 'core:promo:deactivated':
			return 'This promo code is no longer active';
		case 'core:promo:already-redeemed':
			return 'You already used this promo code';
		case 'core:promo:host-cannot-redeem':
			return 'You cannot use codes on your own raffle';
		case 'core:promo:raffle-mismatch':
			return 'This code is not valid for this raffle';
		case 'core:promo:order-already-discounted':
			return 'This order already has a promo code';
		case 'core:promo:question-required':
			return 'Please answer the question first';
		case 'core:raffle:not-live':
			return 'This raffle is not currently active';
		case 'core:order:not-found':
			return 'Order not found';
		case 'core:order:not-pending':
			return 'This order can no longer be updated';
		case 'core:order:permission-denied':
			return 'You do not have access to this order';
		case 'global:validation:invalid-argument':
		case 'invalid_code':
		case 'validation_error':
			return 'Invalid promo code request';
		case 'global:auth:unauthenticated':
		case 'unauthorized':
			return 'Please sign in to continue';
		case 'network_error':
			return 'Network error. Please check your connection';
		case 'timeout_error':
			return 'Request timed out. Please try again';
		default:
			return 'Failed to redeem code. Please try again';
	}
}

/**
 * Determines if promo should be cleared from UI after an error.
 * Only clear for deterministic business errors, not transient network issues.
 *
 * @param errorCode - Error code from a failed promo redemption attempt
 * @returns True if the promo input should be cleared (invalid code), false if retryable
 */
export function shouldClearPromo(errorCode: string): boolean {
	switch (errorCode) {
		case 'core:promo:not-found':
		case 'core:promo:expired':
		case 'core:promo:max-uses-reached':
		case 'core:promo:deactivated':
		case 'core:promo:already-redeemed':
		case 'core:promo:host-cannot-redeem':
		case 'core:promo:raffle-mismatch':
		case 'core:promo:order-already-discounted':
		case 'global:validation:invalid-argument':
		case 'invalid_code':
			return true;
		default:
			return false;
	}
}
