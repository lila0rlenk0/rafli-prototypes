import { describe, expect, test } from 'bun:test';

import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
	describe('USD formatting', () => {
		test('formats whole number', () => {
			expect(formatCurrency(1_000, 'USD')).toBe('$1,000');
		});

		test('formats decimal amount with two places', () => {
			expect(formatCurrency(19.99, 'USD')).toBe('$19.99');
		});

		test('formats zero', () => {
			expect(formatCurrency(0, 'USD')).toBe('$0');
		});

		test('formats large amount with commas', () => {
			expect(formatCurrency(1_000_000, 'USD')).toBe('$1,000,000');
		});

		test('strips trailing zeros from decimals', () => {
			// maximumFractionDigits: 2, minimumFractionDigits: 0 — trailing zeros stripped
			expect(formatCurrency(10.0, 'USD')).toBe('$10');
		});

		test('rounds to two decimal places', () => {
			expect(formatCurrency(9.999, 'USD')).toBe('$10');
		});
	});

	describe('string input', () => {
		test('parses string amount', () => {
			expect(formatCurrency('49.99', 'USD')).toBe('$49.99');
		});

		test('parses whole number string', () => {
			expect(formatCurrency('500', 'USD')).toBe('$500');
		});
	});

	describe('other currencies', () => {
		test('formats EUR', () => {
			const result = formatCurrency(100, 'EUR');
			// Intl.NumberFormat may use narrow no-break space or regular — check symbol presence
			expect(result).toContain('€');
			expect(result).toContain('100');
		});

		test('formats GBP', () => {
			const result = formatCurrency(250, 'GBP');
			expect(result).toContain('£');
		});
	});

	describe('edge cases', () => {
		test('handles negative amount', () => {
			const result = formatCurrency(-50, 'USD');
			expect(result).toContain('$50');
		});

		test('handles very small decimal', () => {
			expect(formatCurrency(0.01, 'USD')).toBe('$0.01');
		});
	});
});
