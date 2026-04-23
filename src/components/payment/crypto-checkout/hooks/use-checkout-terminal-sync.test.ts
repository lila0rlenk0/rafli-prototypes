import { describe, expect, test } from 'bun:test';

import { CHECKOUT_PHASE, type CheckoutStatus } from '@/types/checkout-status';

import {
	derivePollingPhaseDecision,
	FALLBACK_FAILURE_MESSAGE,
} from './use-checkout-terminal-sync';

// ==========================================
// Fixtures
// ==========================================

/**
 * Minimal `CheckoutStatus` that still satisfies the discriminated union.
 * Only `phase`, `canRetry`, and `crypto.*` are read by the reducer; every
 * other field is inert but must be present for type alignment.
 */
function buildStatus(
	overrides: Partial<CheckoutStatus> & Pick<CheckoutStatus, 'phase'>,
): CheckoutStatus {
	return {
		activeMethod: 'crypto',
		canRetry: false,
		canSwitchMethod: false,
		crypto: null,
		orderId: 'order_123',
		orderStatus: 'pending',
		stripe: null,
		...overrides,
	};
}

function buildCryptoBlock(
	overrides: Partial<NonNullable<CheckoutStatus['crypto']>> = {},
): NonNullable<CheckoutStatus['crypto']> {
	return {
		blockConfirmations: 0,
		chainId: 1,
		confirmationTarget: 1,
		confirmDeadline: new Date().toISOString(),
		expiresAt: new Date().toISOString(),
		failureReason: null,
		id: 'session_123',
		isActive: true,
		status: 'pending',
		submitDeadline: new Date().toISOString(),
		txHash: null,
		...overrides,
	};
}

// ==========================================
// Tests
// ==========================================

describe('derivePollingPhaseDecision', () => {
	describe('undefined status', () => {
		test('returns noop while polling has not produced a status yet', () => {
			expect(derivePollingPhaseDecision(undefined)).toEqual({ kind: 'noop' });
		});
	});

	describe('COMPLETED phase', () => {
		test('surfaces a success decision', () => {
			const status = buildStatus({ phase: CHECKOUT_PHASE.COMPLETED });

			expect(derivePollingPhaseDecision(status)).toEqual({ kind: 'success' });
		});
	});

	describe('FAILED phase', () => {
		test('stays on noop when canRetry is true so cron recovery can resume', () => {
			// canRetry on FAILED means backend grace-period reactivation is
			// possible — FE must stay in confirming for polling to catch it.
			const status = buildStatus({
				phase: CHECKOUT_PHASE.FAILED,
				canRetry: true,
			});

			expect(derivePollingPhaseDecision(status)).toEqual({ kind: 'noop' });
		});

		test('unknown failureReason string maps to generic copy — internal text mitigated', () => {
			const status = buildStatus({
				phase: CHECKOUT_PHASE.FAILED,
				canRetry: false,
				crypto: buildCryptoBlock({
					failureReason: 'Insufficient confirmations',
				}),
			});

			expect(derivePollingPhaseDecision(status)).toEqual({
				kind: 'failure',
				message: FALLBACK_FAILURE_MESSAGE,
			});
		});

		test('maps known payment error codes from failureReason', () => {
			const status = buildStatus({
				phase: CHECKOUT_PHASE.FAILED,
				canRetry: false,
				crypto: buildCryptoBlock({
					failureReason: 'payments:crypto:tx-already-used',
				}),
			});

			expect(derivePollingPhaseDecision(status)).toEqual({
				kind: 'failure',
				message:
					'This transaction was already used for another payment. Please start a new checkout',
			});
		});

		test('falls back to a generic message when backend omits a reason', () => {
			const status = buildStatus({
				phase: CHECKOUT_PHASE.FAILED,
				canRetry: false,
				crypto: buildCryptoBlock({ failureReason: null }),
			});

			expect(derivePollingPhaseDecision(status)).toEqual({
				kind: 'failure',
				message: FALLBACK_FAILURE_MESSAGE,
			});
		});

		test('falls back to the generic message when there is no crypto block', () => {
			const status = buildStatus({
				phase: CHECKOUT_PHASE.FAILED,
				canRetry: false,
				crypto: null,
			});

			expect(derivePollingPhaseDecision(status)).toEqual({
				kind: 'failure',
				message: FALLBACK_FAILURE_MESSAGE,
			});
		});
	});

	describe('AWAITING_PAYMENT phase', () => {
		test('fails fast when there is no crypto tx hash to wait on', () => {
			// Session expired / abandoned while we were confirming — transition
			// to failure immediately instead of burning out the poll timeout.
			const status = buildStatus({
				phase: CHECKOUT_PHASE.AWAITING_PAYMENT,
				crypto: null,
			});

			expect(derivePollingPhaseDecision(status)).toEqual({
				kind: 'failure',
				message: 'Payment session expired. Please try again.',
			});
		});

		test('keeps polling when a hash is present but backend has not yet advanced', () => {
			// Transient state: hash registered, but backend cron has not yet
			// flipped the phase to `confirming`. Safe to keep polling.
			const status = buildStatus({
				phase: CHECKOUT_PHASE.AWAITING_PAYMENT,
				crypto: buildCryptoBlock({ txHash: '0xabc' }),
			});

			expect(derivePollingPhaseDecision(status)).toEqual({ kind: 'noop' });
		});
	});

	describe('CONFIRMING phase', () => {
		test('stays on noop — the hook only transitions on terminal phases', () => {
			const status = buildStatus({ phase: CHECKOUT_PHASE.CONFIRMING });

			expect(derivePollingPhaseDecision(status)).toEqual({ kind: 'noop' });
		});
	});
});
