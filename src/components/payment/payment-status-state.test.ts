import { describe, expect, test } from 'bun:test';

import { COMMON_ERROR_CODES, PAYMENT_ERROR_CODES } from '@/types/errors';

import {
	buildStripeVerificationReturnTo,
	getStripeVerificationFailureCopy,
	resolveStripeVerificationState,
} from './payment-status-state';

describe('resolveStripeVerificationState', () => {
	test('keeps polling only for explicit unpaid responses', () => {
		expect(
			resolveStripeVerificationState({
				success: true,
				data: { orderId: 'order_1', status: 'unpaid' },
			}),
		).toEqual({
			status: 'unpaid',
			errorCode: null,
			shouldPoll: true,
		});
	});

	test('does not poll for paid status', () => {
		expect(
			resolveStripeVerificationState({
				success: true,
				data: { orderId: 'order_1', status: 'paid' },
			}),
		).toEqual({
			status: 'paid',
			errorCode: null,
			shouldPoll: false,
		});
	});

	test('does not poll for expired status', () => {
		expect(
			resolveStripeVerificationState({
				success: true,
				data: { orderId: 'order_1', status: 'expired' },
			}),
		).toEqual({
			status: 'expired',
			errorCode: null,
			shouldPoll: false,
		});
	});

	test('treats verification failures as terminal non-polling states', () => {
		expect(
			resolveStripeVerificationState({
				success: false,
				error: PAYMENT_ERROR_CODES.STRIPE_SESSION_NOT_FOUND,
			}),
		).toEqual({
			status: 'verification-failed',
			errorCode: PAYMENT_ERROR_CODES.STRIPE_SESSION_NOT_FOUND,
			shouldPoll: false,
		});
	});
});

describe('getStripeVerificationFailureCopy', () => {
	test('routes auth failures into sign-in recovery', () => {
		expect(
			getStripeVerificationFailureCopy(
				COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED,
			),
		).toEqual({
			title: 'Sign in to verify payment',
			description:
				'Your session expired before we could verify this checkout. Sign in again and we will return you to this payment status screen.',
			canRetry: false,
			requiresSignIn: true,
		});
	});

	test('marks ownership/not-found failures as non-retryable', () => {
		expect(
			getStripeVerificationFailureCopy(
				PAYMENT_ERROR_CODES.STRIPE_PERMISSION_DENIED,
			),
		).toEqual({
			title: 'Unable to verify this checkout',
			description:
				'This Stripe session does not belong to your account or is no longer available. No additional charge will be created here.',
			canRetry: false,
			requiresSignIn: false,
		});
	});

	test('keeps transient verification failures manually retryable', () => {
		expect(
			getStripeVerificationFailureCopy(PAYMENT_ERROR_CODES.FETCH_FAILED),
		).toEqual({
			title: 'Payment verification unavailable',
			description:
				'We could not verify Stripe right now. Your payment may still complete. Try verification again in a moment or check My Raffles.',
			canRetry: true,
			requiresSignIn: false,
		});
	});
});

describe('buildStripeVerificationReturnTo', () => {
	test('preserves the redirect session for sign-in recovery', () => {
		expect(buildStripeVerificationReturnTo('my-raffle', 'cs_test_123')).toBe(
			'/browse/my-raffle?session_id=cs_test_123',
		);
	});
});
