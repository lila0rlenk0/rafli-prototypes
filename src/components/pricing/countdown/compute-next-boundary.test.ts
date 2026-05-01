import { describe, expect, test } from 'bun:test';

import { computeNextBoundary } from './compute-next-boundary';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TWO_DAYS = 2 * DAY;

describe('computeNextBoundary', () => {
	describe('happy path', () => {
		test('returns the next boundary above an arbitrary now', () => {
			// 100 windows in, plus 1 second past the boundary → next boundary
			// is the 101st window mark.
			const now = TWO_DAYS * 100 + SECOND;
			expect(computeNextBoundary(now, TWO_DAYS)).toBe(TWO_DAYS * 101);
		});

		test('next boundary is window-length away when now sits at the previous boundary', () => {
			// nowMs % windowMs === 0 must NOT return nowMs itself — the ticker
			// would render an expired frame for a tick before rolling forward.
			expect(computeNextBoundary(TWO_DAYS * 50, TWO_DAYS)).toBe(TWO_DAYS * 51);
		});

		test('result is strictly greater than now across the window', () => {
			// Sanity loop: the moment-by-moment invariant the ticker depends on.
			expect(computeNextBoundary(0, TWO_DAYS)).toBe(TWO_DAYS);
			expect(computeNextBoundary(TWO_DAYS - SECOND, TWO_DAYS)).toBe(TWO_DAYS);
			expect(computeNextBoundary(TWO_DAYS, TWO_DAYS)).toBe(TWO_DAYS * 2);
			expect(computeNextBoundary(TWO_DAYS + 1, TWO_DAYS)).toBe(TWO_DAYS * 2);
		});
	});

	describe('edge cases', () => {
		test('works with sub-day windows', () => {
			// Verifies the formula isn't accidentally hard-coded to days.
			expect(computeNextBoundary(HOUR + MINUTE, HOUR)).toBe(HOUR * 2);
		});
	});
});
