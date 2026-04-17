import { describe, expect, test } from 'bun:test';

import { normalizeSubmissionsFilterValue } from './submissions-filters';

describe('normalizeSubmissionsFilterValue', () => {
	const STATUS_VALUES = ['all', 'pending', 'approved', 'rejected'] as const;

	test('falls back to all when value is missing', () => {
		expect(normalizeSubmissionsFilterValue(null, STATUS_VALUES)).toBe('all');
	});

	test('falls back to all when value is invalid', () => {
		expect(normalizeSubmissionsFilterValue('bogus-status', STATUS_VALUES)).toBe(
			'all',
		);
	});

	test('preserves allowed values', () => {
		expect(normalizeSubmissionsFilterValue('approved', STATUS_VALUES)).toBe(
			'approved',
		);
	});
});
