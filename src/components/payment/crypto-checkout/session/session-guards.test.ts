import { describe, expect, test } from 'bun:test';
import { getAddress } from 'viem';

import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';

import {
	getHydratedCheckoutStep,
	getPaySessionRevalidationDecision,
	getPolledTxHashSyncDecision,
	getReviewSessionGuard,
	isTerminalConfirmError,
	shouldScheduleConfirmRetry,
} from './session-guards';

/** Backend-provided submit deadline — 10 minutes after some base time */
const SUBMIT_DEADLINE = '2026-03-13T12:10:00.000Z';
const SUBMIT_DEADLINE_MS = new Date(SUBMIT_DEADLINE).getTime();

/** Valid EVM addresses for test fixtures — getAddress returns checksummed Address type */
const WALLET_A = getAddress('0x1234567890AbCdEf1234567890aBcDeF12345678');
const WALLET_A_LOWER = getAddress('0x1234567890abcdef1234567890abcdef12345678');
const WALLET_B = getAddress('0xdEaDbEeF00000000000000000000000000000001');

describe('getReviewSessionGuard', () => {
	test('allows send when wallet binding matches and submit grace is still open', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A_LOWER,
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('ready');
	});

	test('blocks send when the connected wallet changed', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: WALLET_B,
				sessionWalletAddress: WALLET_A,
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('wallet-changed');
	});

	test('blocks send when submit grace is exhausted', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS + 1,
			}).kind,
		).toBe('session-expired');
	});

	test('returns missing-session when submitDeadline is null', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
				submitDeadline: null,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('missing-session');
	});

	test('returns wallet-changed when connected address is null', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: null,
				sessionWalletAddress: WALLET_A,
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('wallet-changed');
	});

	test('returns wallet-changed when session wallet is null', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: WALLET_A,
				sessionWalletAddress: null,
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('wallet-changed');
	});
});

describe('getPaySessionRevalidationDecision', () => {
	test('keeps pending sessions sendable before submit grace expires', () => {
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.PENDING,
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}),
		).toEqual({ kind: 'sendable' });
	});

	test('blocks send for expired pending sessions', () => {
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.PENDING,
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS + 1,
			}),
		).toEqual({ kind: 'session-expired' });
	});

	test('rehydrates already-confirming sessions instead of sending again', () => {
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.CONFIRMING,
				submitDeadline: SUBMIT_DEADLINE,
			}),
		).toEqual({
			kind: 'rehydrate',
			nextStep: 'confirming',
		});
	});

	test('rehydrates terminal sessions into their terminal FE steps', () => {
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.COMPLETED,
				submitDeadline: SUBMIT_DEADLINE,
			}),
		).toEqual({
			kind: 'rehydrate',
			nextStep: 'success',
		});
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.FAILED,
				submitDeadline: SUBMIT_DEADLINE,
			}),
		).toEqual({
			kind: 'rehydrate',
			nextStep: 'failure',
		});
	});
});

describe('getHydratedCheckoutStep', () => {
	test('maps pending status to review step', () => {
		expect(getHydratedCheckoutStep(CRYPTO_PAYMENT_STATUS.PENDING)).toBe(
			'review',
		);
	});

	test('maps confirming status to confirming step', () => {
		expect(getHydratedCheckoutStep(CRYPTO_PAYMENT_STATUS.CONFIRMING)).toBe(
			'confirming',
		);
	});

	test('maps completed status to success step', () => {
		expect(getHydratedCheckoutStep(CRYPTO_PAYMENT_STATUS.COMPLETED)).toBe(
			'success',
		);
	});

	test('maps failed status to failure step', () => {
		expect(getHydratedCheckoutStep(CRYPTO_PAYMENT_STATUS.FAILED)).toBe(
			'failure',
		);
	});
});

describe('getPolledTxHashSyncDecision', () => {
	test('returns noop when polled hash is null', () => {
		expect(
			getPolledTxHashSyncDecision({
				localTxHash: '0xabc',
				polledTxHash: null,
			}),
		).toEqual({ kind: 'noop' });
	});

	test('returns noop when polled hash is undefined', () => {
		expect(
			getPolledTxHashSyncDecision({
				localTxHash: undefined,
				polledTxHash: undefined,
			}),
		).toEqual({ kind: 'noop' });
	});

	test('adopts the backend hash when confirming recovery has no local hash yet', () => {
		const validHash =
			'0xAbC1230000000000000000000000000000000000000000000000000000000001';
		const lowered = validHash.toLowerCase() as `0x${string}`;
		expect(
			getPolledTxHashSyncDecision({
				localTxHash: undefined,
				polledTxHash: validHash as `0x${string}`,
			}),
		).toEqual({
			kind: 'sync-backend-hash',
			normalizedBackendHash: lowered,
			adoptLocalTxHash: lowered,
		});
	});

	test('keeps the local wallet hash when polling reports a different backend hash', () => {
		const localHash =
			'0xdef4560000000000000000000000000000000000000000000000000000000002';
		const polledHash =
			'0xAbC1230000000000000000000000000000000000000000000000000000000001';
		expect(
			getPolledTxHashSyncDecision({
				localTxHash: localHash as `0x${string}`,
				polledTxHash: polledHash,
			}),
		).toEqual({
			kind: 'sync-backend-hash',
			normalizedBackendHash: polledHash.toLowerCase(),
		});
	});

	test('returns noop when polled hash is malformed (not 0x + 64 hex)', () => {
		// Short hash — would previously be cast unsafely to `0x${string}`
		expect(
			getPolledTxHashSyncDecision({
				localTxHash: undefined,
				polledTxHash: '0xAbC123',
			}),
		).toEqual({ kind: 'noop' });

		// Missing 0x prefix
		expect(
			getPolledTxHashSyncDecision({
				localTxHash: undefined,
				polledTxHash:
					'abc1230000000000000000000000000000000000000000000000000000000001',
			}),
		).toEqual({ kind: 'noop' });
	});
});

describe('confirm retry classification', () => {
	test('treats expired/missing/unrecoverable sessions as terminal', () => {
		expect(isTerminalConfirmError('payments:crypto:session-expired')).toBe(
			true,
		);
		expect(isTerminalConfirmError('payments:crypto:session-not-found')).toBe(
			true,
		);
		expect(
			isTerminalConfirmError('payments:crypto:order-not-recoverable'),
		).toBe(true);
	});

	test('does not schedule retries for convergence/terminal codes', () => {
		expect(
			shouldScheduleConfirmRetry('payments:crypto:already-confirming'),
		).toBe(false);
		expect(
			shouldScheduleConfirmRetry('payments:crypto:already-completed'),
		).toBe(false);
		expect(
			shouldScheduleConfirmRetry('payments:crypto:concurrent-update'),
		).toBe(false);
		expect(shouldScheduleConfirmRetry('payments:crypto:session-expired')).toBe(
			false,
		);
	});

	test('keeps retry enabled for transient confirm failures', () => {
		expect(shouldScheduleConfirmRetry('payments:crypto:confirm-failed')).toBe(
			true,
		);
		expect(shouldScheduleConfirmRetry('network_error')).toBe(true);
	});
});
