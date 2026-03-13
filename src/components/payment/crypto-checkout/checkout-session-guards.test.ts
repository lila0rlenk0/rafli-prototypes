import { describe, expect, test } from 'bun:test';

import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';

import {
	getPaySessionRevalidationDecision,
	getReviewSessionGuard,
	resolveCheckoutHydrationDecision,
} from './checkout-session-guards';

const EXPIRES_AT = '2026-03-13T12:00:00.000Z';
const SUBMIT_DEADLINE_MS = new Date('2026-03-13T12:10:00.000Z').getTime();

describe('getReviewSessionGuard', () => {
	test('allows send when wallet binding matches and submit grace is still open', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xabc',
				sessionWalletAddress: '0xAbC',
				expiresAt: EXPIRES_AT,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('ready');
	});

	test('blocks send when the connected wallet changed', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xdef',
				sessionWalletAddress: '0xabc',
				expiresAt: EXPIRES_AT,
				now: SUBMIT_DEADLINE_MS - 1,
			}).kind,
		).toBe('wallet-changed');
	});

	test('blocks send when submit grace is exhausted', () => {
		expect(
			getReviewSessionGuard({
				connectedAddress: '0xabc',
				sessionWalletAddress: '0xabc',
				expiresAt: EXPIRES_AT,
				now: SUBMIT_DEADLINE_MS + 1,
			}).kind,
		).toBe('session-expired');
	});
});

describe('getPaySessionRevalidationDecision', () => {
	test('keeps pending sessions sendable before submit grace expires', () => {
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.PENDING,
				expiresAt: EXPIRES_AT,
				now: SUBMIT_DEADLINE_MS - 1,
			}),
		).toEqual({ kind: 'sendable' });
	});

	test('blocks send for expired pending sessions', () => {
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.PENDING,
				expiresAt: EXPIRES_AT,
				now: SUBMIT_DEADLINE_MS + 1,
			}),
		).toEqual({ kind: 'session-expired' });
	});

	test('rehydrates already-confirming sessions instead of sending again', () => {
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.CONFIRMING,
				expiresAt: EXPIRES_AT,
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
				expiresAt: EXPIRES_AT,
			}),
		).toEqual({
			kind: 'rehydrate',
			nextStep: 'success',
		});
		expect(
			getPaySessionRevalidationDecision({
				status: CRYPTO_PAYMENT_STATUS.FAILED,
				expiresAt: EXPIRES_AT,
			}),
		).toEqual({
			kind: 'rehydrate',
			nextStep: 'failure',
		});
	});
});

describe('resolveCheckoutHydrationDecision', () => {
	test('uses review fallback for fresh-session read failures', () => {
		expect(
			resolveCheckoutHydrationDecision({
				allowReviewFallback: true,
				sessionReadSucceeded: false,
			}),
		).toEqual({ kind: 'review-fallback' });
	});

	test('uses confirming recovery for read failures while recovering backend-owned sessions', () => {
		expect(
			resolveCheckoutHydrationDecision({
				allowReviewFallback: false,
				sessionReadSucceeded: false,
			}),
		).toEqual({ kind: 'confirming-recovery' });
	});

	test('maps successful reads to authoritative FE steps', () => {
		expect(
			resolveCheckoutHydrationDecision({
				allowReviewFallback: false,
				sessionReadSucceeded: true,
				serverStatus: CRYPTO_PAYMENT_STATUS.PENDING,
			}),
		).toEqual({
			kind: 'apply-server-state',
			nextStep: 'review',
		});
		expect(
			resolveCheckoutHydrationDecision({
				allowReviewFallback: false,
				sessionReadSucceeded: true,
				serverStatus: CRYPTO_PAYMENT_STATUS.CONFIRMING,
			}),
		).toEqual({
			kind: 'apply-server-state',
			nextStep: 'confirming',
		});
	});
});
