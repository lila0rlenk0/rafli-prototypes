import { describe, expect, test } from 'bun:test';

import {
	CRYPTO_TX_SUBMIT_OUTCOME,
	getCryptoTxSubmitOutcome,
	normalizeTxHash,
	toBackendConfirmationCount,
} from './crypto-payment-flow';
import { COMMON_ERROR_CODES, PAYMENT_ERROR_CODES } from '@/types/errors';

describe('normalizeTxHash', () => {
	test('normalizes mixed-case hashes to lowercase', () => {
		expect(normalizeTxHash('0xAbCdEf')).toBe('0xabcdef');
	});
});

describe('toBackendConfirmationCount', () => {
	test('keeps unconfirmed transactions at zero', () => {
		expect(toBackendConfirmationCount(undefined)).toBe(0);
		expect(toBackendConfirmationCount(0)).toBe(0);
		expect(toBackendConfirmationCount(0n)).toBe(0);
	});

	test('aligns viem counts with backend block-distance semantics', () => {
		expect(toBackendConfirmationCount(1)).toBe(0);
		expect(toBackendConfirmationCount(2)).toBe(1);
		expect(toBackendConfirmationCount(5n)).toBe(4);
	});
});

describe('getCryptoTxSubmitOutcome', () => {
	test('keeps transport-level failures on the retry path', () => {
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.TIMEOUT_ERROR),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
	});

	test('uses poll-only recovery once backend already moved the session', () => {
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_ALREADY_CONFIRMING),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.POLL);
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_CONCURRENT_UPDATE),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.POLL);
	});

	test('treats deterministic backend rejections as terminal', () => {
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL);
		expect(
			getCryptoTxSubmitOutcome(PAYMENT_ERROR_CODES.CRYPTO_TX_ALREADY_USED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL);
		expect(
			getCryptoTxSubmitOutcome(COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED),
		).toBe(CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL);
	});
});
