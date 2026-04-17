import { describe, expect, test } from 'bun:test';

import { parsePositivePageParam } from './parse-positive-page-param';

describe('parsePositivePageParam', () => {
	test('defaults to 1 for missing values', () => {
		expect(parsePositivePageParam()).toBe(1);
	});

	test('defaults to 1 for invalid number strings', () => {
		expect(parsePositivePageParam('not-a-number')).toBe(1);
	});

	test('defaults to 1 for zero or negative pages', () => {
		expect(parsePositivePageParam('0')).toBe(1);
		expect(parsePositivePageParam('-5')).toBe(1);
	});

	test('parses valid positive page values', () => {
		expect(parsePositivePageParam('7')).toBe(7);
	});
});
