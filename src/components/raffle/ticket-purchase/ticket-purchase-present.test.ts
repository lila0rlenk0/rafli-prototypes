import { describe, expect, test } from 'bun:test';

import {
	formatBonusEntriesLabel,
	getClosingSoonWarning,
	parseAvailableCredits,
} from './ticket-purchase-present';

describe('parseAvailableCredits', () => {
	test('nullish input resolves to zero', () => {
		expect(parseAvailableCredits(null)).toBe(0);
		expect(parseAvailableCredits(undefined)).toBe(0);
		// Empty string is falsy — same fallback as null.
		expect(parseAvailableCredits('')).toBe(0);
	});

	test('valid decimal string parses to number', () => {
		expect(parseAvailableCredits('12.50')).toBe(12.5);
		expect(parseAvailableCredits('0.01')).toBe(0.01);
		expect(parseAvailableCredits('100')).toBe(100);
	});

	test('malformed string coerces to zero', () => {
		// Defensive: we never want a NaN balance leaking to the gate check.
		expect(parseAvailableCredits('abc')).toBe(0);
		expect(parseAvailableCredits('NaN')).toBe(0);
	});

	test('negative balance clamps to zero', () => {
		// Backend should never send negatives, but we guard anyway — a negative
		// balance should not unlock the CTA.
		expect(parseAvailableCredits('-5')).toBe(0);
	});
});

describe('getClosingSoonWarning', () => {
	test('non-crypto flow returns base message', () => {
		const copy = getClosingSoonWarning({
			hasSelectableCryptoPaymentOption: false,
		});
		expect(copy).toContain('Sweepstakes closes soon');
		expect(copy).not.toContain('Crypto payments');
	});

	test('crypto flow appends confirmation-lag sentence', () => {
		const copy = getClosingSoonWarning({
			hasSelectableCryptoPaymentOption: true,
		});
		expect(copy).toContain('Sweepstakes closes soon');
		expect(copy).toContain('Crypto payments can take longer to confirm');
	});
});

describe('formatBonusEntriesLabel', () => {
	test('singular for exactly one entry', () => {
		expect(formatBonusEntriesLabel(1)).toBe('1 bonus entry with this code');
	});

	test('plural for zero and many', () => {
		expect(formatBonusEntriesLabel(0)).toBe('0 bonus entries with this code');
		expect(formatBonusEntriesLabel(5)).toBe('5 bonus entries with this code');
	});
});
