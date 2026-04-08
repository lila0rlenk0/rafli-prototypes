import { describe, expect, test } from 'bun:test';

import {
	getOrderErrorMessage,
	getPaymentErrorMessage,
	getPromoErrorMessage,
	getWalletErrorMessage,
	shouldClearPromo,
} from './error-messages';

describe('getOrderErrorMessage', () => {
	test('maps already-completed order error', () => {
		expect(getOrderErrorMessage('core:order:already-completed')).toBe(
			'This order has already been completed.',
		);
	});

	test('falls back to generic message for unknown codes', () => {
		expect(
			getOrderErrorMessage(
				'unknown:code' as Parameters<typeof getOrderErrorMessage>[0],
			),
		).toBe('Failed to create order. Please try again');
	});
});

describe('getPaymentErrorMessage', () => {
	test('maps checkout-failed to user-friendly message', () => {
		expect(getPaymentErrorMessage('payments:checkout:failed')).toBe(
			'Failed to create checkout session. Please try again',
		);
	});

	test('maps confirm-failed', () => {
		expect(getPaymentErrorMessage('payments:crypto:confirm-failed')).toBe(
			'Failed to confirm transaction. Please contact support',
		);
	});

	test('maps fetch_failed', () => {
		expect(getPaymentErrorMessage('fetch_failed')).toBe(
			'Failed to load payment data. Please try again',
		);
	});

	test('maps connection_aborted', () => {
		expect(getPaymentErrorMessage('connection_aborted')).toBe(
			'Connection lost. Check your network and try again.',
		);
	});

	test('maps service_unavailable', () => {
		expect(getPaymentErrorMessage('service_unavailable')).toBe(
			'Service temporarily unavailable. Please try again shortly.',
		);
	});

	test('maps credits insufficient-balance', () => {
		expect(
			getPaymentErrorMessage('payments:credits:insufficient-balance'),
		).toBe("You don't have enough credits for this purchase");
	});

	test('maps credits order-not-found', () => {
		expect(getPaymentErrorMessage('payments:credits:order-not-found')).toBe(
			'Order not found',
		);
	});

	test('maps credits order-not-pending', () => {
		expect(getPaymentErrorMessage('payments:credits:order-not-pending')).toBe(
			'This order is no longer available for payment',
		);
	});

	test('maps credits invalid-amount and invalid-order-amount', () => {
		expect(getPaymentErrorMessage('payments:credits:invalid-amount')).toBe(
			'Invalid order amount for credit payment',
		);
		expect(
			getPaymentErrorMessage('payments:credits:invalid-order-amount'),
		).toBe('Invalid order amount for credit payment');
	});

	test('maps credits payment-session-active', () => {
		expect(
			getPaymentErrorMessage('payments:credits:payment-session-active'),
		).toBe(
			'A pending payment session exists. Please wait for it to expire or try again',
		);
	});

	test('falls back to generic message for unknown codes', () => {
		expect(
			getPaymentErrorMessage(
				'unknown:code' as Parameters<typeof getPaymentErrorMessage>[0],
			),
		).toBe('Failed to start checkout. Please try again');
	});
});

describe('getWalletErrorMessage', () => {
	test('maps malformed wallet signature errors', () => {
		expect(getWalletErrorMessage('auth:wallet:invalid-signature')).toBe(
			'Invalid wallet signature. Please try again',
		);
	});

	test('maps stale wallet timestamp errors', () => {
		expect(getWalletErrorMessage('auth:wallet:invalid-timestamp')).toBe(
			'Wallet verification expired. Please sign a fresh message',
		);
	});

	test('maps validation-failed', () => {
		expect(getWalletErrorMessage('auth:wallet:validation-failed')).toBe(
			'Wallet verification response was invalid. Please try again',
		);
	});

	test('maps fetch_failed', () => {
		expect(getWalletErrorMessage('fetch_failed')).toBe(
			'Failed to load wallet data. Please try again',
		);
	});

	test('falls back to generic message for unknown codes', () => {
		expect(
			getWalletErrorMessage(
				'unknown:code' as Parameters<typeof getWalletErrorMessage>[0],
			),
		).toBe('Wallet operation failed. Please try again');
	});
});

describe('getPromoErrorMessage', () => {
	test('maps not-found error', () => {
		expect(getPromoErrorMessage('core:promo:not-found')).toBe(
			'Promo code not found',
		);
	});

	test('maps expired error', () => {
		expect(getPromoErrorMessage('core:promo:expired')).toBe(
			'This promo code has expired',
		);
	});

	test('maps max-uses-reached error', () => {
		expect(getPromoErrorMessage('core:promo:max-uses-reached')).toBe(
			'This promo code has reached its usage limit',
		);
	});

	test('maps deactivated error', () => {
		expect(getPromoErrorMessage('core:promo:deactivated')).toBe(
			'This promo code is no longer active',
		);
	});

	test('maps already-redeemed error', () => {
		expect(getPromoErrorMessage('core:promo:already-redeemed')).toBe(
			'You already used this promo code',
		);
	});

	test('maps host-cannot-redeem error', () => {
		expect(getPromoErrorMessage('core:promo:host-cannot-redeem')).toBe(
			'You cannot use codes on your own raffle',
		);
	});

	test('maps raffle-mismatch error', () => {
		expect(getPromoErrorMessage('core:promo:raffle-mismatch')).toBe(
			'This code is not valid for this raffle',
		);
	});

	test('maps order-already-discounted error', () => {
		expect(getPromoErrorMessage('core:promo:order-already-discounted')).toBe(
			'This order already has a promo code',
		);
	});

	test('maps invalid-argument error', () => {
		expect(getPromoErrorMessage('global:validation:invalid-argument')).toBe(
			'Invalid promo code request',
		);
	});

	test('maps invalid_code error', () => {
		expect(getPromoErrorMessage('invalid_code')).toBe(
			'Invalid promo code request',
		);
	});

	test('falls back to generic message for unknown codes', () => {
		expect(getPromoErrorMessage('unknown:code')).toBe(
			'Failed to redeem code. Please try again',
		);
	});
});

describe('shouldClearPromo', () => {
	test.each([
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
	])('returns true for deterministic error: %s', (code: string) => {
		expect(shouldClearPromo(code)).toBe(true);
	});

	test.each(['network_error', 'timeout_error', 'unknown:code'])(
		'returns false for transient/unknown error: %s',
		(code: string) => {
			expect(shouldClearPromo(code)).toBe(false);
		},
	);
});
