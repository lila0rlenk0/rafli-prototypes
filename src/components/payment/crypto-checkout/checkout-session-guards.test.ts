import { describe, expect, test } from 'bun:test';

import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';

import {
	getPaySessionRevalidationDecision,
	getPolledTxHashSyncDecision,
	getReviewSessionGuard,
	resolveCheckoutHydrationDecision,
} from './checkout-session-guards';

/** Backend-provided submit deadline — 10 minutes after some base time */
const SUBMIT_DEADLINE = '2026-03-13T12:10:00.000Z';
const SUBMIT_DEADLINE_MS = new Date(SUBMIT_DEADLINE).getTime();

describe('getReviewSessionGuard', () => {
	test('allows send when wallet binding matches and submit grace is still open', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xabc',
				sessionWalletAddress: '0xAbC',
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('ready');
	});

	test('blocks send when the connected wallet changed', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xdef',
				sessionWalletAddress: '0xabc',
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('wallet-changed');
	});

	test('blocks send when submit grace is exhausted', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xabc',
				sessionWalletAddress: '0xabc',
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS + 1,
			}).kind,
		).toBe('session-expired');
	});

	test('returns missing-session when submitDeadline is null', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xabc',
				sessionWalletAddress: '0xabc',
				submitDeadline: null,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('missing-session');
	});

	test('returns wallet-changed when connected address is null', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: null,
				sessionWalletAddress: '0xabc',
				submitDeadline: SUBMIT_DEADLINE,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('wallet-changed');
	});

	test('returns wallet-changed when session wallet is null', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xabc',
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

describe('resolveCheckoutHydrationDecision', () => {
	test('uses review fallback for read failures', () => {
		expect(
			resolveCheckoutHydrationDecision({
				sessionReadSucceeded: false,
			}),
		).toEqual({ kind: 'review-fallback' });
	});

	test('maps successful reads to authoritative FE steps', () => {
		expect(
			resolveCheckoutHydrationDecision({
				sessionReadSucceeded: true,
				serverStatus: CRYPTO_PAYMENT_STATUS.PENDING,
			}),
		).toEqual({
			kind: 'apply-server-state',
			nextStep: 'review',
		});
		expect(
			resolveCheckoutHydrationDecision({
				sessionReadSucceeded: true,
				serverStatus: CRYPTO_PAYMENT_STATUS.CONFIRMING,
			}),
		).toEqual({
			kind: 'apply-server-state',
			nextStep: 'confirming',
		});
	});

	test('maps completed session to success step', () => {
		expect(
			resolveCheckoutHydrationDecision({
				sessionReadSucceeded: true,
				serverStatus: CRYPTO_PAYMENT_STATUS.COMPLETED,
			}),
		).toEqual({
			kind: 'apply-server-state',
			nextStep: 'success',
		});
	});

	test('maps failed session to failure step', () => {
		expect(
			resolveCheckoutHydrationDecision({
				sessionReadSucceeded: true,
				serverStatus: CRYPTO_PAYMENT_STATUS.FAILED,
			}),
		).toEqual({
			kind: 'apply-server-state',
			nextStep: 'failure',
		});
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
		expect(
			getPolledTxHashSyncDecision({
				localTxHash: undefined,
				polledTxHash: validHash as `0x${string}`,
			}),
		).toEqual({
			kind: 'sync-backend-hash',
			normalizedBackendHash: validHash.toLowerCase(),
			adoptLocalTxHash: validHash,
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
