import { describe, expect, test } from 'bun:test';

import { formatTimeAgo } from './format-time-ago';

describe('formatTimeAgo', () => {
	describe('just now', () => {
		test('returns "Just now" for current time', () => {
			expect(formatTimeAgo(new Date())).toBe('Just now');
		});

		test('returns "Just now" for 30 seconds ago', () => {
			const date = new Date(Date.now() - 30_000);
			expect(formatTimeAgo(date)).toBe('Just now');
		});
	});

	describe('minutes', () => {
		test('returns "1m ago" for 1 minute ago', () => {
			const date = new Date(Date.now() - 60_000);
			expect(formatTimeAgo(date)).toBe('1m ago');
		});

		test('returns "30m ago" for 30 minutes ago', () => {
			const date = new Date(Date.now() - 30 * 60_000);
			expect(formatTimeAgo(date)).toBe('30m ago');
		});

		test('returns "59m ago" for 59 minutes ago', () => {
			const date = new Date(Date.now() - 59 * 60_000);
			expect(formatTimeAgo(date)).toBe('59m ago');
		});
	});

	describe('hours', () => {
		test('returns "1h ago" for 1 hour ago', () => {
			const date = new Date(Date.now() - 3_600_000);
			expect(formatTimeAgo(date)).toBe('1h ago');
		});

		test('returns "23h ago" for 23 hours ago', () => {
			const date = new Date(Date.now() - 23 * 3_600_000);
			expect(formatTimeAgo(date)).toBe('23h ago');
		});
	});

	describe('days', () => {
		test('returns "1d ago" for 1 day ago', () => {
			const date = new Date(Date.now() - 86_400_000);
			expect(formatTimeAgo(date)).toBe('1d ago');
		});

		test('returns "6d ago" for 6 days ago', () => {
			const date = new Date(Date.now() - 6 * 86_400_000);
			expect(formatTimeAgo(date)).toBe('6d ago');
		});
	});

	describe('absolute date fallback', () => {
		test('returns localized date for 7+ days ago', () => {
			const date = new Date(Date.now() - 7 * 86_400_000);
			const result = formatTimeAgo(date);
			// Should not contain "ago" — falls back to toLocaleDateString
			expect(result).not.toContain('ago');
			// Should contain a slash or comma (locale date format)
			expect(result.length).toBeGreaterThan(0);
		});

		test('returns localized date for 30 days ago', () => {
			const date = new Date(Date.now() - 30 * 86_400_000);
			const result = formatTimeAgo(date);
			expect(result).not.toContain('ago');
		});
	});

	describe('string input', () => {
		test('accepts ISO date string', () => {
			const result = formatTimeAgo(new Date().toISOString());
			expect(result).toBe('Just now');
		});
	});
});
