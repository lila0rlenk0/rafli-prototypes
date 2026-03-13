import { describe, expect, test } from 'bun:test';

import { getConfirmationTarget, getTxExplorerUrl } from './block-explorers';

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

	test('falls back to default for unknown chains', () => {
		expect(getConfirmationTarget(99_999)).toBe(12);
	});
});

describe('getTxExplorerUrl', () => {
	test('builds full explorer URL for known chains', () => {
		expect(getTxExplorerUrl('0xabc', 1)).toBe('https://etherscan.io/tx/0xabc');
		expect(getTxExplorerUrl('0xdef', 42_161)).toBe(
			'https://arbiscan.io/tx/0xdef',
		);
	});

	test('returns null when txHash is undefined', () => {
		expect(getTxExplorerUrl(undefined, 1)).toBeNull();
	});

	test('returns null when chainId is null or undefined', () => {
		expect(getTxExplorerUrl('0xabc', null)).toBeNull();
		expect(getTxExplorerUrl('0xabc', undefined)).toBeNull();
	});

	test('returns null for unknown chain IDs', () => {
		expect(getTxExplorerUrl('0xabc', 99_999)).toBeNull();
	});
});
