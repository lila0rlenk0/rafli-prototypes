import { describe, expect, test } from 'bun:test';

import { getVerifiedToastMessage } from './verified-toast';

describe('getVerifiedToastMessage', () => {
	describe('outcome → copy mapping', () => {
		test('found claims verification', () => {
			expect(getVerifiedToastMessage(1, 'found')).toBe(
				'Bonus entry granted — we verified your post.',
			);
		});

		test('unavailable surfaces a thank-you (does not claim verification)', () => {
			const msg = getVerifiedToastMessage(1, 'unavailable');
			expect(msg).toBe('Bonus entry granted — thanks for sharing!');
			expect(msg).not.toContain('verified');
		});

		test('not_found_exhausted surfaces a thank-you (does not claim verification)', () => {
			const msg = getVerifiedToastMessage(1, 'not_found_exhausted');
			expect(msg).toBe('Bonus entry granted — thanks for sharing!');
			expect(msg).not.toContain('verified');
		});

		test('omitted (idempotent replay) falls back to neutral copy', () => {
			expect(getVerifiedToastMessage(1, undefined)).toBe(
				"Bonus entry granted! You're in the sweepstakes now.",
			);
		});

		test('blind-grant variants differ from the verified-and-neutral copies', () => {
			// Regression guard — the whole point of `verifyOutcome` is to keep
			// the verified-claim copy out of the blind-grant paths. If anyone
			// collapses these back to identical strings the test breaks first.
			const found = getVerifiedToastMessage(1, 'found');
			const unavailable = getVerifiedToastMessage(1, 'unavailable');
			const exhausted = getVerifiedToastMessage(1, 'not_found_exhausted');
			const neutral = getVerifiedToastMessage(1, undefined);
			expect(found).not.toBe(unavailable);
			expect(found).not.toBe(neutral);
			expect(unavailable).not.toBe(neutral);
			expect(unavailable).toBe(exhausted);
		});
	});

	describe('pluralisation', () => {
		test('single ticket uses "Bonus entry"', () => {
			expect(getVerifiedToastMessage(1, 'found')).toContain('Bonus entry ');
		});

		test('multi-ticket uses "Bonus entries"', () => {
			expect(getVerifiedToastMessage(3, 'found')).toContain('Bonus entries ');
		});

		test('pluralisation applies on every branch', () => {
			for (const outcome of [
				'found',
				'unavailable',
				'not_found_exhausted',
				undefined,
			] as const) {
				expect(getVerifiedToastMessage(2, outcome)).toContain('Bonus entries');
			}
		});
	});
});
