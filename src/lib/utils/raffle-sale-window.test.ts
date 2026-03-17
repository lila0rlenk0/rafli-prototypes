import { describe, expect, test } from 'bun:test';

import {
	getRaffleSaleWindow,
	RAFFLE_CLOSING_SOON_THRESHOLD_SECONDS,
} from './raffle-sale-window';

describe('getRaffleSaleWindow', () => {
	const endAt = '2030-01-01T00:10:00.000Z';

	test('marks raffles as closing soon at the 10-minute boundary', () => {
		const result = getRaffleSaleWindow(endAt, new Date('2030-01-01T00:00:00Z'));

		expect(result.secondsRemaining).toBe(RAFFLE_CLOSING_SOON_THRESHOLD_SECONDS);
		expect(result.isClosingSoon).toBe(true);
		expect(result.isExpired).toBe(false);
	});

	test('stays quiet before the warning threshold', () => {
		const result = getRaffleSaleWindow(endAt, new Date('2029-12-31T23:59:59Z'));

		expect(result.secondsRemaining).toBe(
			RAFFLE_CLOSING_SOON_THRESHOLD_SECONDS + 1,
		);
		expect(result.isClosingSoon).toBe(false);
		expect(result.isExpired).toBe(false);
	});

	test('marks the final second before expiry as closing soon', () => {
		const result = getRaffleSaleWindow(endAt, new Date('2030-01-01T00:09:59Z'));

		expect(result.secondsRemaining).toBe(1);
		expect(result.isClosingSoon).toBe(true);
		expect(result.isExpired).toBe(false);
	});

	test('marks raffles as expired at the cutoff', () => {
		const result = getRaffleSaleWindow(endAt, new Date('2030-01-01T00:10:00Z'));

		expect(result.secondsRemaining).toBe(0);
		expect(result.isClosingSoon).toBe(false);
		expect(result.isExpired).toBe(true);
	});
});
