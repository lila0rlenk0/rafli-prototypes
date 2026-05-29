import { describe, expect, test } from 'bun:test';

import { resolveConfirmationTier } from './tier';

describe('resolveConfirmationTier', () => {
	test('1-9 entries fall in TIER1', () => {
		expect(resolveConfirmationTier(1)).toBe('TIER1');
		expect(resolveConfirmationTier(9)).toBe('TIER1');
	});

	test('10 is the TIER2 floor (boundary)', () => {
		// 9 → TIER1, 10 → TIER2 — off-by-one at this seam would cap
		// the entry-card colour at brand-mint instead of stepping up
		// to brand-sky for a customer who just bought their 10th entry.
		expect(resolveConfirmationTier(10)).toBe('TIER2');
	});

	test('29 stays in TIER2', () => {
		expect(resolveConfirmationTier(29)).toBe('TIER2');
	});

	test('30 is the TIER3 floor (boundary)', () => {
		// Mirror of the TIER2 boundary — the celebration card jumps to
		// brand-yellow + larger size here.
		expect(resolveConfirmationTier(30)).toBe('TIER3');
	});

	test('handles very large purchases as TIER3', () => {
		expect(resolveConfirmationTier(1_000)).toBe('TIER3');
	});

	test('zero entries degrade to TIER1 rather than throwing', () => {
		// `ticketQuantity` should never be 0 in real flows (callers gate
		// on a successful purchase), but the function must not crash if
		// a caller hands it a degenerate value.
		expect(resolveConfirmationTier(0)).toBe('TIER1');
	});
});
