import type {
	OrderErrorCode,
	PaymentErrorCode,
	PromoCodeErrorCode,
} from '@/types/errors';

// ==========================================
// Order Error Messages
// ==========================================

/**
 * Maps order error codes to user-friendly messages
 * Shared between card and crypto checkout flows
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
		case 'network_error':
			return 'Network error. Please check your connection';
		case 'timeout_error':
			return 'Request timed out. Please try again';
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
 * Maps payment error codes to user-friendly messages
 * Shared between Stripe and crypto checkout flows
 */
export function getPaymentErrorMessage(errorCode: PaymentErrorCode): string {
	switch (errorCode) {
		case 'payments:session:already-completed':
		case 'payments:crypto:already-completed':
			return 'This order has already been paid';
		case 'payments:crypto:session-expired':
			return 'Checkout session expired. Please try again';
		case 'payments:crypto:wallet-not-verified':
			return 'Please verify your wallet first';
		case 'payments:crypto:raffle-not-accepting':
			return 'This raffle does not accept crypto payments';
		case 'payments:crypto:unsupported-chain':
			return 'Selected network is not supported for this raffle';
		case 'payments:crypto:tx-already-used':
			return 'This transaction was already submitted';
		case 'payments:crypto:submit-failed':
			return 'Failed to verify transaction. Please contact support';
		case 'core:order:not-found':
			return 'Order not found';
		case 'core:order:permission-denied':
			return 'You do not have access to this order';
		case 'network_error':
			return 'Network error. Please check your connection';
		case 'timeout_error':
			return 'Request timed out. Please try again';
		case 'validation_error':
			return 'Invalid request. Please try again';
		default:
			return 'Failed to start checkout. Please try again';
	}
}

// ==========================================
// Promo Code Error Messages
// ==========================================

/**
 * Maps promo code error codes to user-friendly messages
 * Shared between card and crypto checkout flows
 */
export function getPromoErrorMessage(errorCode: PromoCodeErrorCode): string {
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
 */
export function shouldClearPromo(errorCode: PromoCodeErrorCode): boolean {
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
