import { describe, expect, test } from 'bun:test';

import type { CryptoCheckoutSession } from '@/types/wallet';

import {
	formatNativeBalance,
	formatPaymentAmount,
	formatTokenBalance,
	truncateAddress,
} from './format';

const BASE_SESSION: CryptoCheckoutSession = {
	id: 'session-1',
	amount: '10.00',
	amountRaw: '10000000',
	chainId: 1,
	tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
	treasuryAddress: '0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
	orderId: 'order-1',
	expiresAt: '2026-03-13T12:00:00.000Z',
};

describe('formatPaymentAmount', () => {
	test('returns placeholder when session is missing', () => {
		expect(formatPaymentAmount(null)).toBe('\u2014');
	});

	test('keeps fiat-like amounts at two decimals', () => {
		expect(formatPaymentAmount({ ...BASE_SESSION, amount: '10' })).toBe(
			'10.00',
		);
		expect(formatPaymentAmount({ ...BASE_SESSION, amount: '12.30' })).toBe(
			'12.30',
		);
	});

	test('preserves small non-stablecoin precision up to four decimals', () => {
		expect(formatPaymentAmount({ ...BASE_SESSION, amount: '0.1234' })).toBe(
			'0.1234',
		);
		expect(formatPaymentAmount({ ...BASE_SESSION, amount: '12.3400' })).toBe(
			'12.34',
		);
	});
});

describe('formatNativeBalance', () => {
	test('returns placeholder when balance is undefined', () => {
		expect(formatNativeBalance(undefined)).toBe('\u2014');
	});

	test('formats native balances to four decimals', () => {
		expect(
			formatNativeBalance({
				value: 1_234_567_890_000_000_000n,
				decimals: 18,
				symbol: 'ETH',
			}),
		).toBe('1.2346');
	});
});

describe('formatTokenBalance', () => {
	test('returns placeholder when balance is undefined', () => {
		expect(formatTokenBalance(undefined)).toBe('\u2014');
	});

	test('formats stablecoin balances to two decimals', () => {
		expect(
			formatTokenBalance({
				value: 12_345_678n,
				decimals: 6,
				symbol: 'USDC',
			}),
		).toBe('12.35');
	});

	test('formats higher-precision token balances to four decimals', () => {
		expect(
			formatTokenBalance({
				value: 123_456_789_123_456_789n,
				decimals: 18,
				symbol: 'EARNM',
			}),
		).toBe('0.1235');
	});
});

describe('truncateAddress', () => {
	test('keeps the first 6 and last 4 characters', () => {
		expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(
			'0x1234...5678',
		);
	});
});
