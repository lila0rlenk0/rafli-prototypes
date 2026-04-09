import { describe, expect, test } from 'bun:test';

import { formatDate, formatDateTime } from './date-format';

describe('formatDate', () => {
	describe('valid inputs', () => {
		test('formats ISO date string', () => {
			const result = formatDate('2026-01-16T00:00:00.000Z');
			expect(result).toContain('Jan');
			expect(result).toContain('16');
			expect(result).toContain('2026');
		});

		test('formats Date object', () => {
			// UTC midnight Jan 16 — month/day may shift by locale TZ, but year is stable
			const result = formatDate(new Date('2026-07-04T12:00:00.000Z'));
			expect(result).toContain('2026');
		});

		test('formats date-only string', () => {
			const result = formatDate('2025-12-25');
			expect(result).toContain('2025');
		});
	});

	describe('edge cases', () => {
		test('returns empty string for empty input', () => {
			// Cast: runtime guard handles falsy — testing the guard path
			expect(formatDate('' as unknown as string)).toBe('');
		});
	});
});

describe('formatDateTime', () => {
	describe('valid inputs', () => {
		test('formats date string with time', () => {
			const result = formatDateTime('2026-01-16', '14:30');
			expect(result).toContain('Jan');
			expect(result).toContain('16');
			expect(result).toContain('2026');
		});

		test('formats Date object with time', () => {
			const result = formatDateTime(
				new Date('2026-03-20T00:00:00.000Z'),
				'09:15',
			);
			expect(result).toContain('2026');
		});

		test('formats ISO string with time', () => {
			const result = formatDateTime('2026-06-15T10:00:00.000Z', '18:00');
			expect(result).toContain('2026');
		});
	});

	describe('edge cases', () => {
		test('returns empty string for empty date input', () => {
			// Cast: runtime guard handles falsy — testing the guard path
			expect(formatDateTime('' as unknown as string, '14:30')).toBe('');
		});

		test('handles empty time string by using date as-is', () => {
			const result = formatDateTime('2026-01-16T14:30:00.000Z', '');
			expect(result).toContain('2026');
		});
	});
});
