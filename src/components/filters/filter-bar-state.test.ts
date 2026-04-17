import { describe, expect, test } from 'bun:test';

import { RAFFLE_SORT_OPTION } from '@/types/raffle';
import { normalizeSortOption } from './filter-bar-state';

describe('normalizeSortOption', () => {
	test('defaults to newest when query param missing', () => {
		expect(normalizeSortOption(null)).toBe(RAFFLE_SORT_OPTION.NEWEST);
	});

	test('defaults to newest for unknown sort values', () => {
		expect(normalizeSortOption('not-a-real-sort')).toBe(
			RAFFLE_SORT_OPTION.NEWEST,
		);
	});

	test('preserves known sort values', () => {
		expect(normalizeSortOption(RAFFLE_SORT_OPTION.LOWEST_PRICE)).toBe(
			RAFFLE_SORT_OPTION.LOWEST_PRICE,
		);
	});
});
