import { describe, expect, test } from 'bun:test';

import { getConfirmationTarget } from './block-explorers';

describe('getConfirmationTarget', () => {
	test('matches backend parity for sequencer-based chains', () => {
		expect(getConfirmationTarget(42_161)).toBe(1);
		expect(getConfirmationTarget(8453)).toBe(1);
		expect(getConfirmationTarget(421_614)).toBe(1);
		expect(getConfirmationTarget(84_532)).toBe(1);
	});

	test('matches backend parity for Polygon-style reorg protection', () => {
		expect(getConfirmationTarget(137)).toBe(128);
		expect(getConfirmationTarget(80_002)).toBe(128);
	});
});
