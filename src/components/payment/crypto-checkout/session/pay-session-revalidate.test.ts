import { describe, expect, test } from 'bun:test';
import { getAddress } from 'viem';

import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';
import type { CryptoCheckoutSession } from '@/types/wallet';

import {
	revalidateSessionBeforePay,
	type GetCryptoSessionFn,
	type RevalidatedServerSession,
} from './pay-session-revalidate';

// ==========================================
// Fixtures
// ==========================================

const SESSION_ID = 'session-1';

/** Checksummed EVM address — wallet + treasury use the same fixture to keep focus on outcome logic */
const WALLET = getAddress('0x1234567890AbCdEf1234567890aBcDeF12345678');

/** Minimal checkout session — only `id` is read by `revalidateSessionBeforePay` */
const SESSION: CryptoCheckoutSession = {
	id: SESSION_ID,
	amount: '10',
	walletAddress: WALLET,
	amountRaw: '10000000',
	chainId: 8453,
	tokenAddress: WALLET,
	treasuryAddress: WALLET,
	orderId: 'order-1',
	expiresAt: '2026-04-22T10:00:00.000Z',
	submitDeadline: '2026-04-22T10:10:00.000Z',
	confirmDeadline: '2026-04-22T10:40:00.000Z',
	confirmationTarget: 12,
};

/** Deadline far enough in the future that `getPaySessionRevalidationDecision` stays sendable */
const FUTURE_DEADLINE = '2099-01-01T00:00:00.000Z';

/** Deadline in the past — forces the pending branch into session-expired */
const PAST_DEADLINE = '2000-01-01T00:00:00.000Z';

function buildServerSession(
	overrides: Partial<RevalidatedServerSession>,
): RevalidatedServerSession {
	return {
		status: CRYPTO_PAYMENT_STATUS.PENDING,
		submitDeadline: FUTURE_DEADLINE,
		confirmDeadline: FUTURE_DEADLINE,
		txHash: null,
		currency: 'USDC',
		failureReason: null,
		...overrides,
	};
}

function buildSuccessReader(
	session: RevalidatedServerSession,
): GetCryptoSessionFn {
	return async () => ({ success: true, data: session });
}

function buildFailureReader(error: PaymentErrorCode): GetCryptoSessionFn {
	return async () => ({ success: false, error });
}

// ==========================================
// Tests
// ==========================================

describe('revalidateSessionBeforePay', () => {
	describe('happy path', () => {
		test('returns ok with refreshed server session when pending + within submit window', async () => {
			const serverSession = buildServerSession({});
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildSuccessReader(serverSession),
			);

			expect(outcome).toEqual({ kind: 'ok', refreshedSession: serverSession });
		});
	});

	describe('pending but expired submit window', () => {
		test('returns session-expired when the pending session is past its submit deadline', async () => {
			const serverSession = buildServerSession({
				submitDeadline: PAST_DEADLINE,
			});
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildSuccessReader(serverSession),
			);

			expect(outcome.kind).toBe('session-expired');
		});
	});

	describe('status advanced past pending', () => {
		test('returns rehydrate with confirming step when server moved to confirming', async () => {
			const serverSession = buildServerSession({
				status: CRYPTO_PAYMENT_STATUS.CONFIRMING,
			});
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildSuccessReader(serverSession),
			);

			expect(outcome).toEqual({
				kind: 'rehydrate',
				refreshedSession: serverSession,
				nextStep: 'confirming',
			});
		});

		test('returns rehydrate with success step when server reports completed', async () => {
			const serverSession = buildServerSession({
				status: CRYPTO_PAYMENT_STATUS.COMPLETED,
			});
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildSuccessReader(serverSession),
			);

			expect(outcome).toEqual({
				kind: 'rehydrate',
				refreshedSession: serverSession,
				nextStep: 'success',
			});
		});

		test('returns rehydrate with failure step when server reports failed', async () => {
			const serverSession = buildServerSession({
				status: CRYPTO_PAYMENT_STATUS.FAILED,
			});
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildSuccessReader(serverSession),
			);

			expect(outcome).toEqual({
				kind: 'rehydrate',
				refreshedSession: serverSession,
				nextStep: 'failure',
			});
		});
	});

	describe('read failures', () => {
		test('returns recoverable on transient errors that are not terminal codes', async () => {
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildFailureReader('network_error'),
			);

			expect(outcome).toEqual({ kind: 'recoverable' });
		});

		test('returns session-expired on CRYPTO_SESSION_EXPIRED', async () => {
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildFailureReader(PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED),
			);

			expect(outcome.kind).toBe('session-expired');
		});

		test('returns session-expired on CRYPTO_SESSION_NOT_FOUND', async () => {
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildFailureReader(PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND),
			);

			expect(outcome.kind).toBe('session-expired');
		});

		test('returns session-expired on CRYPTO_ORDER_NOT_RECOVERABLE', async () => {
			const outcome = await revalidateSessionBeforePay(
				SESSION,
				buildFailureReader(PAYMENT_ERROR_CODES.CRYPTO_ORDER_NOT_RECOVERABLE),
			);

			expect(outcome.kind).toBe('session-expired');
		});
	});
});
