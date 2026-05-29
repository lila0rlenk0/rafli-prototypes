import { describe, expect, test } from 'bun:test';

import { formatWinnerPosition } from './winner-position';

describe('formatWinnerPosition', () => {
	test('renders the 0-indexed first winner as "Position #1", never #0', () => {
		expect(formatWinnerPosition(0, 5)).toBe('Position #1');
	});

	test('renders later positions 1-based', () => {
		expect(formatWinnerPosition(2, 5)).toBe('Position #3');
	});

	test('suppresses the label for a single-winner raffle', () => {
		expect(formatWinnerPosition(0, 1)).toBeNull();
	});

	test('suppresses the label when the winner count is unknown (0)', () => {
		expect(formatWinnerPosition(0, 0)).toBeNull();
	});
});
