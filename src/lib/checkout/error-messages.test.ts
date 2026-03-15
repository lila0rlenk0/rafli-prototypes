import { describe, expect, test } from 'bun:test';

import {
	getOrderErrorMessage,
	getPaymentErrorMessage,
	getWalletErrorMessage,
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
