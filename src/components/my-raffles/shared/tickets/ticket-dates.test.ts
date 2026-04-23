import { describe, expect, test } from 'bun:test';

import {
	buildDateTime,
	checkIfStartDateIsToday,
	getTodayDate,
	isDateRangeValid,
	isEndDateWithin6Months,
} from './ticket-dates';

/**
 * Helpers return local dates — tests construct reference values with the
 * same constructor so we don't accidentally assert UTC semantics.
 */
function localDate(
	year: number,
	month: number,
	day: number,
	hour = 0,
	minute = 0,
): Date {
	return new Date(year, month - 1, day, hour, minute);
}

/**
 * Formats a Date in the `YYYY-MM-DD` shape stored by the form, using local
 * components so the round-trip never drifts across timezones.
 */
function formatLocalDateString(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

describe('buildDateTime', () => {
	test('combines date and time into a local Date', () => {
		expect(buildDateTime('2024-06-15', '14:30')).toEqual(
			localDate(2024, 6, 15, 14, 30),
		);
	});

	test('falls back to midnight when time is empty', () => {
		expect(buildDateTime('2024-06-15', '')).toEqual(localDate(2024, 6, 15));
	});

	test('parses single-digit month/day strings', () => {
		expect(buildDateTime('2024-1-5', '09:00')).toEqual(
			localDate(2024, 1, 5, 9, 0),
		);
	});
});

describe('getTodayDate', () => {
	test('returns a Date at local midnight', () => {
		const today = getTodayDate();
		expect(today.getHours()).toBe(0);
		expect(today.getMinutes()).toBe(0);
		expect(today.getSeconds()).toBe(0);
		expect(today.getMilliseconds()).toBe(0);
	});

	test('matches today in local year/month/day', () => {
		const now = new Date();
		const today = getTodayDate();
		expect(today.getFullYear()).toBe(now.getFullYear());
		expect(today.getMonth()).toBe(now.getMonth());
		expect(today.getDate()).toBe(now.getDate());
	});
});

describe('checkIfStartDateIsToday', () => {
	test('empty string returns false', () => {
		expect(checkIfStartDateIsToday('')).toBe(false);
	});

	test("today's local date string returns true", () => {
		const today = getTodayDate();
		expect(checkIfStartDateIsToday(formatLocalDateString(today))).toBe(true);
	});

	test('yesterday returns false', () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		expect(checkIfStartDateIsToday(formatLocalDateString(yesterday))).toBe(
			false,
		);
	});

	test('tomorrow returns false', () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		expect(checkIfStartDateIsToday(formatLocalDateString(tomorrow))).toBe(
			false,
		);
	});
});

describe('isDateRangeValid', () => {
	const start = { date: '2024-06-15', time: '10:00' } as const;

	test('empty start or end is treated as valid', () => {
		expect(
			isDateRangeValid(
				{ date: '', time: '' },
				{ date: '2024-06-20', time: '' },
			),
		).toBe(true);
		expect(isDateRangeValid(start, { date: '', time: '' })).toBe(true);
	});

	test('exactly 24 hours later is valid (boundary)', () => {
		expect(isDateRangeValid(start, { date: '2024-06-16', time: '10:00' })).toBe(
			true,
		);
	});

	test('23 hours 59 minutes later is invalid', () => {
		expect(isDateRangeValid(start, { date: '2024-06-16', time: '09:59' })).toBe(
			false,
		);
	});

	test('multi-day range is valid', () => {
		expect(isDateRangeValid(start, { date: '2024-07-15', time: '10:00' })).toBe(
			true,
		);
	});

	test('end earlier than start is invalid', () => {
		expect(isDateRangeValid(start, { date: '2024-06-14', time: '10:00' })).toBe(
			false,
		);
	});
});

describe('isEndDateWithin6Months', () => {
	// Pick a start date clear of month-length edge cases so the boundaries
	// are unambiguous. June 15 + 6 months = December 15.
	const start = { date: '2024-06-15', time: '10:00' } as const;

	test('empty start or end is treated as valid', () => {
		expect(
			isEndDateWithin6Months(
				{ date: '', time: '' },
				{ date: '2024-07-01', time: '' },
			),
		).toBe(true);
		expect(isEndDateWithin6Months(start, { date: '', time: '' })).toBe(true);
	});

	test('one day less than 6 months is valid', () => {
		expect(
			isEndDateWithin6Months(start, { date: '2024-12-14', time: '10:00' }),
		).toBe(true);
	});

	test('exactly 6 months later is valid (boundary)', () => {
		expect(
			isEndDateWithin6Months(start, { date: '2024-12-15', time: '10:00' }),
		).toBe(true);
	});

	test('one day past 6 months is invalid', () => {
		expect(
			isEndDateWithin6Months(start, { date: '2024-12-16', time: '10:00' }),
		).toBe(false);
	});

	test('one minute past 6 months is invalid', () => {
		expect(
			isEndDateWithin6Months(start, { date: '2024-12-15', time: '10:01' }),
		).toBe(false);
	});

	test('year-spanning range within 6 months is valid', () => {
		expect(
			isEndDateWithin6Months(
				{ date: '2024-10-15', time: '10:00' },
				{ date: '2025-04-15', time: '10:00' },
			),
		).toBe(true);
	});
});
