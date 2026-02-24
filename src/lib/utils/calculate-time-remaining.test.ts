import { describe, expect, test } from 'bun:test';
import { calculateTimeRemaining } from './calculate-time-remaining';

describe('calculateTimeRemaining', () => {
	describe('expired states', () => {
		test('returns expired for 0 seconds', () => {
			const result = calculateTimeRemaining(0);
			expect(result).toEqual({
				days: 0,
				hours: 0,
				minutes: 0,
				seconds: 0,
				isExpired: true,
			});
		});

		test('returns expired for negative seconds', () => {
			const result = calculateTimeRemaining(-100);
			expect(result).toEqual({
				days: 0,
				hours: 0,
				minutes: 0,
				seconds: 0,
				isExpired: true,
			});
		});
	});

	describe('seconds only', () => {
		test('1 second', () => {
			const result = calculateTimeRemaining(1);
			expect(result).toEqual({
				days: 0,
				hours: 0,
				minutes: 0,
				seconds: 1,
				isExpired: false,
			});
		});

		test('59 seconds', () => {
			const result = calculateTimeRemaining(59);
			expect(result).toEqual({
				days: 0,
				hours: 0,
				minutes: 0,
				seconds: 59,
				isExpired: false,
			});
		});
	});

	describe('minutes decomposition', () => {
		test('exactly 1 minute', () => {
			const result = calculateTimeRemaining(60);
			expect(result).toEqual({
				days: 0,
				hours: 0,
				minutes: 1,
				seconds: 0,
				isExpired: false,
			});
		});

		test('1 minute 30 seconds', () => {
			const result = calculateTimeRemaining(90);
			expect(result).toEqual({
				days: 0,
				hours: 0,
				minutes: 1,
				seconds: 30,
				isExpired: false,
			});
		});
	});

	describe('hours decomposition', () => {
		test('exactly 1 hour', () => {
			const result = calculateTimeRemaining(3_600);
			expect(result).toEqual({
				days: 0,
				hours: 1,
				minutes: 0,
				seconds: 0,
				isExpired: false,
			});
		});

		test('2 hours 30 minutes 15 seconds', () => {
			const result = calculateTimeRemaining(2 * 3_600 + 30 * 60 + 15);
			expect(result).toEqual({
				days: 0,
				hours: 2,
				minutes: 30,
				seconds: 15,
				isExpired: false,
			});
		});
	});

	describe('days decomposition', () => {
		test('exactly 1 day', () => {
			const result = calculateTimeRemaining(86_400);
			expect(result).toEqual({
				days: 1,
				hours: 0,
				minutes: 0,
				seconds: 0,
				isExpired: false,
			});
		});

		test('1 day 12 hours 30 minutes 45 seconds', () => {
			const result = calculateTimeRemaining(86_400 + 12 * 3_600 + 30 * 60 + 45);
			expect(result).toEqual({
				days: 1,
				hours: 12,
				minutes: 30,
				seconds: 45,
				isExpired: false,
			});
		});
	});

	describe('large values (the original bug scenario)', () => {
		test('45 days decomposes correctly', () => {
			const fortyFiveDays = 45 * 86_400;
			const result = calculateTimeRemaining(fortyFiveDays);
			expect(result).toEqual({
				days: 45,
				hours: 0,
				minutes: 0,
				seconds: 0,
				isExpired: false,
			});
		});

		test('90 days + remainder', () => {
			const total = 90 * 86_400 + 5 * 3_600 + 23 * 60 + 17;
			const result = calculateTimeRemaining(total);
			expect(result).toEqual({
				days: 90,
				hours: 5,
				minutes: 23,
				seconds: 17,
				isExpired: false,
			});
		});

		test('365 days', () => {
			const result = calculateTimeRemaining(365 * 86_400);
			expect(result).toEqual({
				days: 365,
				hours: 0,
				minutes: 0,
				seconds: 0,
				isExpired: false,
			});
		});
	});
});
