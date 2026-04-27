import { describe, expect, test } from 'bun:test';

import type { Category } from '@/types/category';

import {
	getActivePeriodDisplay,
	getCategoryDisplay,
	getDeclaredValueDisplay,
	getDescriptionDisplay,
	getParticipantsRangeDisplay,
	getPaymentSummaryDisplay,
	getPricePerTicketDisplay,
	getPromoCodesCountDisplay,
	getWinnersDisplay,
	willStartImmediately,
	type ReviewFormValues,
} from './field-getters';

// Fixture — base values representing a fully-filled review screen. Each
// test that cares about a specific branch overrides only the relevant
// fields via spread, so the test body stays focused on the branch.
const BASE_VALUES: ReviewFormValues = {
	description: 'A fun sweepstakes',
	category: 'cat-1',
	price: 120,
	pricePerTicket: 5,
	numberOfWinners: 3,
	minParticipants: 10,
	maxParticipants: 100,
	startDate: '2030-01-15',
	startTime: '09:00',
	endDate: '2030-01-20',
	endTime: '18:00',
	acceptsCrypto: false,
	cryptoChainIds: [],
	cryptoTokens: [],
};

const BASE_CATEGORY: Category = {
	id: 'cat-1',
	name: 'Tech',
	slug: 'tech',
	description: null,
	isActive: true,
	sortOrder: 0,
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
};

describe('getDescriptionDisplay', () => {
	test('returns the raw description when present', () => {
		expect(getDescriptionDisplay(BASE_VALUES)).toBe('A fun sweepstakes');
	});

	test('returns the empty string verbatim (MarkdownRenderer handles it)', () => {
		expect(getDescriptionDisplay({ ...BASE_VALUES, description: '' })).toBe('');
	});
});

describe('getCategoryDisplay', () => {
	test('resolves name from matching category ID', () => {
		expect(getCategoryDisplay(BASE_VALUES, [BASE_CATEGORY])).toBe('Tech');
	});

	test('returns placeholder when category ID is empty', () => {
		expect(
			getCategoryDisplay({ ...BASE_VALUES, category: '' }, [BASE_CATEGORY]),
		).toBe('—');
	});

	test('returns placeholder when ID does not match any category', () => {
		expect(
			getCategoryDisplay({ ...BASE_VALUES, category: 'missing' }, [
				BASE_CATEGORY,
			]),
		).toBe('—');
	});
});

describe('getDeclaredValueDisplay', () => {
	test('formats integer prices without decimals', () => {
		expect(getDeclaredValueDisplay(BASE_VALUES)).toBe('$120');
	});

	test('formats fractional prices keeping significant decimals', () => {
		expect(getDeclaredValueDisplay({ ...BASE_VALUES, price: 9.5 })).toBe(
			'$9.5',
		);
	});

	test('formats zero as $0', () => {
		expect(getDeclaredValueDisplay({ ...BASE_VALUES, price: 0 })).toBe('$0');
	});
});

describe('getPricePerTicketDisplay', () => {
	test('formats integer ticket price without decimals', () => {
		expect(getPricePerTicketDisplay(BASE_VALUES)).toBe('$5');
	});

	test('formats fractional ticket price', () => {
		expect(
			getPricePerTicketDisplay({ ...BASE_VALUES, pricePerTicket: 2.75 }),
		).toBe('$2.75');
	});
});

describe('getWinnersDisplay', () => {
	test('returns winner count as string', () => {
		expect(getWinnersDisplay(BASE_VALUES)).toBe('3');
	});

	test('returns "0" when winners is zero (sentinel edge case)', () => {
		// Not allowed by schema in practice, but the getter should still
		// convert deterministically rather than coerce to something else.
		expect(getWinnersDisplay({ ...BASE_VALUES, numberOfWinners: 0 })).toBe('0');
	});
});

describe('getParticipantsRangeDisplay', () => {
	test('formats range when both bounds are set', () => {
		expect(getParticipantsRangeDisplay(BASE_VALUES)).toBe('10 - 100');
	});

	test('renders both zero sentinels verbatim (matches original)', () => {
		expect(
			getParticipantsRangeDisplay({
				...BASE_VALUES,
				minParticipants: 0,
				maxParticipants: 0,
			}),
		).toBe('0 - 0');
	});

	test('formats range when only one bound is zero', () => {
		expect(
			getParticipantsRangeDisplay({
				...BASE_VALUES,
				minParticipants: 0,
				maxParticipants: 50,
			}),
		).toBe('0 - 50');
	});
});

describe('getActivePeriodDisplay', () => {
	test('formats a date range with both endpoints', () => {
		const result = getActivePeriodDisplay(BASE_VALUES);
		expect(result).toContain('Jan 15, 2030');
		expect(result).toContain('Jan 20, 2030');
		expect(result).toContain(' - ');
	});

	test('renders an empty left side when start is missing', () => {
		// Mirrors legacy behavior: dash separator is always present even when
		// only one endpoint is filled in — review screen avoids surprise layout
		// shifts mid-entry.
		const result = getActivePeriodDisplay({
			...BASE_VALUES,
			startDate: '',
			startTime: '',
		});
		expect(result.startsWith(' - ')).toBe(true);
		expect(result).toContain('Jan 20, 2030');
	});

	test('returns just the separator when both endpoints are missing', () => {
		expect(
			getActivePeriodDisplay({
				...BASE_VALUES,
				startDate: '',
				startTime: '',
				endDate: '',
				endTime: '',
			}),
		).toBe(' - ');
	});
});

describe('getPaymentSummaryDisplay', () => {
	test('returns "Card only" when crypto is disabled', () => {
		expect(getPaymentSummaryDisplay(BASE_VALUES)).toBe('Card only');
	});

	test('returns chain/token counts when crypto is enabled', () => {
		const result = getPaymentSummaryDisplay({
			...BASE_VALUES,
			acceptsCrypto: true,
			cryptoChainIds: [1, 137],
			cryptoTokens: ['eth', 'usdc', 'matic'],
		});
		expect(result).toBe('2 chain(s) · 3 token(s)');
	});

	test('handles empty chain/token arrays while enabled', () => {
		// Host has toggled crypto on without picking specifics yet — still
		// renders zero counts so the review screen never shows "Card only"
		// when the underlying flag is true.
		const result = getPaymentSummaryDisplay({
			...BASE_VALUES,
			acceptsCrypto: true,
		});
		expect(result).toBe('0 chain(s) · 0 token(s)');
	});
});

describe('getPromoCodesCountDisplay', () => {
	test('returns "0" for an empty batch list', () => {
		expect(getPromoCodesCountDisplay([])).toBe('0');
	});

	test('sums counts across multiple batches', () => {
		expect(
			getPromoCodesCountDisplay([{ count: 5 }, { count: 10 }, { count: 2 }]),
		).toBe('17');
	});

	test('handles a single batch', () => {
		expect(getPromoCodesCountDisplay([{ count: 3 }])).toBe('3');
	});
});

describe('willStartImmediately', () => {
	test('returns false when startDate is missing', () => {
		expect(
			willStartImmediately({ ...BASE_VALUES, startDate: '', startTime: '' }),
		).toBe(false);
	});

	test('returns true for a clearly past start datetime', () => {
		expect(
			willStartImmediately({
				...BASE_VALUES,
				startDate: '2000-01-01',
				startTime: '00:00',
			}),
		).toBe(true);
	});

	test('returns false for a clearly future start datetime', () => {
		expect(
			willStartImmediately({
				...BASE_VALUES,
				startDate: '2999-12-31',
				startTime: '23:59',
			}),
		).toBe(false);
	});

	test('falls back to 00:00 when startTime is empty', () => {
		// Past date + missing time should still resolve to past (midnight).
		expect(
			willStartImmediately({
				...BASE_VALUES,
				startDate: '2000-01-01',
				startTime: '',
			}),
		).toBe(true);
	});

	test('returns false for an unparseable startDate', () => {
		expect(
			willStartImmediately({
				...BASE_VALUES,
				startDate: 'not-a-date',
				startTime: '00:00',
			}),
		).toBe(false);
	});
});
