import { describe, expect, test } from 'bun:test';

import { utcIsoToZonedWallClock, zonedTimeToUtcIso } from './zoned-time-to-utc';

describe('zonedTimeToUtcIso', () => {
	test('converts EDT wall-clock to the correct UTC instant', () => {
		// New York in June is EDT (UTC-4): 14:30 local → 18:30 UTC
		expect(zonedTimeToUtcIso('2025-06-15T14:30', 'America/New_York')).toBe(
			'2025-06-15T18:30:00.000Z',
		);
	});

	test('converts EST wall-clock to the correct UTC instant', () => {
		// New York in January is EST (UTC-5): 14:30 local → 19:30 UTC
		expect(zonedTimeToUtcIso('2025-01-15T14:30', 'America/New_York')).toBe(
			'2025-01-15T19:30:00.000Z',
		);
	});

	test('is identity for the UTC zone', () => {
		expect(zonedTimeToUtcIso('2025-06-15T14:30', 'UTC')).toBe(
			'2025-06-15T14:30:00.000Z',
		);
	});

	test('handles positive offsets (Tokyo, UTC+9)', () => {
		// Tokyo has no DST: 09:00 JST → 00:00 UTC same day
		expect(zonedTimeToUtcIso('2025-06-15T09:00', 'Asia/Tokyo')).toBe(
			'2025-06-15T00:00:00.000Z',
		);
	});

	test('handles wraps backwards across midnight', () => {
		// 01:00 Tokyo → 16:00 UTC previous day
		expect(zonedTimeToUtcIso('2025-06-15T01:00', 'Asia/Tokyo')).toBe(
			'2025-06-14T16:00:00.000Z',
		);
	});

	test('handles half-hour offset zones (India, UTC+5:30)', () => {
		expect(zonedTimeToUtcIso('2025-06-15T14:30', 'Asia/Kolkata')).toBe(
			'2025-06-15T09:00:00.000Z',
		);
	});

	test('falls back to native Date parsing for already-zoned strings', () => {
		expect(
			zonedTimeToUtcIso('2025-06-15T14:30:00.000Z', 'America/New_York'),
		).toBe('2025-06-15T14:30:00.000Z');
	});

	test('parses optional seconds in the wall-clock pattern', () => {
		expect(zonedTimeToUtcIso('2025-06-15T14:30:45', 'America/New_York')).toBe(
			'2025-06-15T18:30:45.000Z',
		);
	});
});

describe('utcIsoToZonedWallClock', () => {
	test('extracts EDT wall-clock from UTC ISO', () => {
		// 18:30 UTC in June = 14:30 EDT
		expect(
			utcIsoToZonedWallClock('2025-06-15T18:30:00.000Z', 'America/New_York'),
		).toEqual({ date: '2025-06-15', time: '14:30' });
	});

	test('extracts EST wall-clock from UTC ISO', () => {
		// 19:30 UTC in January = 14:30 EST
		expect(
			utcIsoToZonedWallClock('2025-01-15T19:30:00.000Z', 'America/New_York'),
		).toEqual({ date: '2025-01-15', time: '14:30' });
	});

	test('is identity for UTC', () => {
		expect(utcIsoToZonedWallClock('2025-06-15T14:30:00.000Z', 'UTC')).toEqual({
			date: '2025-06-15',
			time: '14:30',
		});
	});

	test('wraps date forward when zone is ahead of UTC', () => {
		// 16:00 UTC = 01:00 JST next day
		expect(
			utcIsoToZonedWallClock('2025-06-14T16:00:00.000Z', 'Asia/Tokyo'),
		).toEqual({ date: '2025-06-15', time: '01:00' });
	});

	test('round-trips with zonedTimeToUtcIso', () => {
		const iso = '2026-06-01T14:00:00.000Z';
		const { date, time } = utcIsoToZonedWallClock(iso, 'America/New_York');
		expect(zonedTimeToUtcIso(`${date}T${time}`, 'America/New_York')).toBe(iso);
	});
});
