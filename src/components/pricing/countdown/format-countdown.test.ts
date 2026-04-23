import { describe, expect, test } from 'bun:test';

import { formatCountdown } from './format-countdown';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe('formatCountdown', () => {
	describe('happy path', () => {
		test('zero-pads single digits', () => {
			// 1h 1m 1s — matches the "1:01:01" display in the pricing mock.
			expect(formatCountdown(HOUR + MINUTE + SECOND)).toEqual({
				hours: '01',
				minutes: '01',
				seconds: '01',
				expired: false,
			});
		});

		test('formats sub-hour durations correctly', () => {
			expect(formatCountdown(23 * MINUTE + 45 * SECOND)).toEqual({
				hours: '00',
				minutes: '23',
				seconds: '45',
				expired: false,
			});
		});

		test('keeps hours unbounded (no modulo 24)', () => {
			// 73 hours should render as "73:00:00", not "01:00:00" — the banner
			// must convey "this many hours left", not wall-clock time.
			expect(formatCountdown(73 * HOUR)).toEqual({
				hours: '73',
				minutes: '00',
				seconds: '00',
				expired: false,
			});
		});

		test('discards sub-second jitter deterministically', () => {
			// Two ticks 400ms apart inside the same second must render identically.
			const a = formatCountdown(5 * SECOND + 100);
			const b = formatCountdown(5 * SECOND + 500);
			expect(a).toEqual(b);
		});
	});

	describe('edge cases', () => {
		test('flags expired for zero', () => {
			expect(formatCountdown(0)).toEqual({
				hours: '00',
				minutes: '00',
				seconds: '00',
				expired: true,
			});
		});

		test('flags expired for negative drift', () => {
			// Browser clock drift can push the delta a few hundred ms below zero
			// on the final tick; a negative HH would leak to the DOM otherwise.
			expect(formatCountdown(-250)).toEqual({
				hours: '00',
				minutes: '00',
				seconds: '00',
				expired: true,
			});
		});

		test('flags expired for non-finite input', () => {
			// NaN creeps in when endsAt is mis-parsed — coerce rather than render "NaN:NaN:NaN".
			expect(formatCountdown(Number.NaN).expired).toBe(true);
			expect(formatCountdown(Number.POSITIVE_INFINITY).expired).toBe(true);
		});

		test('does not flag expired one tick before deadline', () => {
			expect(formatCountdown(1).expired).toBe(false);
		});
	});
});
