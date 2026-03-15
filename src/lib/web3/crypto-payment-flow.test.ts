import { describe, expect, test } from 'bun:test';

import {
	CRYPTO_TX_SUBMIT_OUTCOME,
	getObservedConfirmationCount,
	getCryptoSessionGraceDeadline,
	getCryptoSessionGraceWindowMs,
	getCryptoTxSubmitOutcome,
	normalizeTxHash,
} from './crypto-payment-flow';
import { COMMON_ERROR_CODES, PAYMENT_ERROR_CODES } from '@/types/errors';

describe('normalizeTxHash', () => {
	test('normalizes mixed-case hashes to lowercase', () => {
		expect(normalizeTxHash('0xAbCdEf')).toBe('0xabcdef');
	});
});

describe('getObservedConfirmationCount', () => {
	test('keeps unconfirmed transactions at zero', () => {
		expect(getObservedConfirmationCount(undefined)).toBe(0);
		expect(getObservedConfirmationCount(0)).toBe(0);
		expect(getObservedConfirmationCount(0n)).toBe(0);
	});

	test('preserves wagmi confirmation semantics', () => {
		expect(getObservedConfirmationCount(1)).toBe(1);
		expect(getObservedConfirmationCount(2)).toBe(2);
		expect(getObservedConfirmationCount(5n)).toBe(5);
	});
});

describe('getCryptoTxSubmitOutcome', () => {
	test('keeps transport-level failures on the retry path', () => {
		expect(getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.TIMEOUT_ERROR)).toBe(
			CRYPTO_TX_SUBMIT_OUTCOME.RETRY,
		);
		expect(getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.NETWORK_ERROR)).toBe(
			CRYPTO_TX_SUBMIT_OUTCOME.RETRY,
		);
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.SERVICE_UNAVAILABLE),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.CONNECTION_ABORTED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
		expect(getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.UNKNOWN_ERROR)).toBe(
			CRYPTO_TX_SUBMIT_OUTCOME.RETRY,
		);
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_SUBMIT_FAILED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
	});

	test('uses poll-only recovery once backend already moved the session', () => {
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_ALREADY_CONFIRMING),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.POLL);
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_ALREADY_COMPLETED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.POLL);
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_CONCURRENT_UPDATE),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.POLL);
	});

	test('routes tx-already-used to poll — hash is registered, polling surfaces terminal state', () => {
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_TX_ALREADY_USED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.POLL);
	});

	test('treats deterministic backend rejections as terminal', () => {
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL);
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL);
	});
});

describe('getCryptoSessionGraceDeadline', () => {
	test('parses backend deadline into millisecond timestamp', () => {
		const deadline = '2026-03-13T12:10:00.000Z';

		expect(getCryptoSessionGraceDeadline(deadline)).toBe(
			new Date(deadline).getTime(),
		);
	});
});

describe('getCryptoSessionGraceWindowMs', () => {
	test('clamps expired deadlines to zero', () => {
		const deadline = '2026-03-13T12:00:00.000Z';
		const afterDeadline = new Date(deadline).getTime() + 1;

		expect(getCryptoSessionGraceWindowMs(deadline, afterDeadline)).toBe(0);
	});

	test('returns remaining milliseconds before deadline', () => {
		const deadline = '2026-03-13T12:10:00.000Z';
		const now = new Date(deadline).getTime() - 30_000;

		expect(getCryptoSessionGraceWindowMs(deadline, now)).toBe(30_000);
	});
});
