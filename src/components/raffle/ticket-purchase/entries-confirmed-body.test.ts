import { describe, expect, test } from 'bun:test';

import { formatOdds } from './entries-confirmed-body';

describe('formatOdds', () => {
	test('formats a normal share with one decimal', () => {
		// 1 / 8 = 12.5% — odds copy lands inside the stat tile, so
		// the precision contract is "exactly one decimal".
		expect(formatOdds(1, 8)).toBe('12.5%');
	});

	test('renders 100.0% when the buyer owns the entire pool', () => {
		expect(formatOdds(5, 5)).toBe('100.0%');
	});

	test('returns 0.0% when the pool is empty', () => {
		// Guard against `entries/0 = Infinity` leaking into the UI as
		// "Infinity%". The early-return branch must hold.
		expect(formatOdds(0, 0)).toBe('0.0%');
	});

	test('returns 0.0% for a negative pool size (degenerate input)', () => {
		expect(formatOdds(1, -3)).toBe('0.0%');
	});

	test('rounds to one fractional digit (banker-style toFixed)', () => {
		// 1 / 3 = 33.333…% — `toFixed(1)` rounds to 33.3.
		expect(formatOdds(1, 3)).toBe('33.3%');
	});
});
