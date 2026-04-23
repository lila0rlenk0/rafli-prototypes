import { describe, expect, test } from 'bun:test';

import {
	formatFieldLabel,
	formatFieldValue,
	formatNullableDate,
} from './format-field';

describe('formatNullableDate', () => {
	describe('null handling', () => {
		test('returns em dash for null', () => {
			expect(formatNullableDate(null)).toBe('—');
		});
	});

	describe('valid dates', () => {
		test('formats non-null ISO string', () => {
			const result = formatNullableDate('2026-01-15T10:30:00Z');
			// Should return something other than em dash — exact format depends on formatDate
			expect(result).not.toBe('—');
			expect(result.length).toBeGreaterThan(0);
		});
	});
});

describe('formatFieldLabel', () => {
	describe('case conversion', () => {
		test('converts camelCase to title case', () => {
			expect(formatFieldLabel('fullLegalName')).toBe('Full Legal Name');
		});

		test('converts snake_case to title case', () => {
			expect(formatFieldLabel('date_of_birth')).toBe('Date Of Birth');
		});

		test('handles single word', () => {
			expect(formatFieldLabel('email')).toBe('Email');
		});

		test('handles already capitalized input', () => {
			expect(formatFieldLabel('ID')).toBe('ID');
		});
	});
});

describe('formatFieldValue', () => {
	describe('null and undefined', () => {
		test('returns em dash for null', () => {
			expect(formatFieldValue(null)).toBe('—');
		});

		test('returns em dash for undefined', () => {
			expect(formatFieldValue(undefined)).toBe('—');
		});
	});

	describe('arrays', () => {
		test('joins arrays with comma', () => {
			expect(formatFieldValue(['electronics', 'gaming'])).toBe(
				'electronics, gaming',
			);
		});

		test('returns empty string for empty array', () => {
			expect(formatFieldValue([])).toBe('');
		});
	});

	describe('other types', () => {
		test('stringifies objects as JSON', () => {
			expect(formatFieldValue({ key: 'value' })).toBe('{"key":"value"}');
		});

		test('converts numbers to string', () => {
			expect(formatFieldValue(42)).toBe('42');
		});

		test('converts booleans to string', () => {
			expect(formatFieldValue(true)).toBe('true');
		});

		test('passes through plain strings', () => {
			expect(formatFieldValue('hello')).toBe('hello');
		});
	});
});
