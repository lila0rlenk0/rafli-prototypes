import { describe, expect, test } from 'bun:test';

import type { Raffle } from '@/types/raffle';
import {
	computePayoutAmountPerWinner,
	computePlatformFee,
	computeTotalDistributed,
	formatCredits,
	isPartialParticipation,
} from './partial-participation';

type RaffleArg = Parameters<typeof isPartialParticipation>[0];

function build(overrides: Partial<RaffleArg> = {}): RaffleArg {
	return {
		status: 'completed' as Raffle['status'],
		participantsCount: 33,
		minParticipants: 150,
		numberOfWinners: 3,
		winners: [
			{ position: 0, status: 'pending' },
			{ position: 1, status: 'pending' },
			{ position: 2, status: 'pending' },
		],
		...overrides,
	};
}

describe('isPartialParticipation', () => {
	test('returns true for completed raffle below minParticipants with winners', () => {
		expect(isPartialParticipation(build())).toBe(true);
	});

	test('returns true for fulfilling raffle below minParticipants with winners', () => {
		expect(
			isPartialParticipation(
				build({ status: 'fulfilling' as Raffle['status'] }),
			),
		).toBe(true);
	});

	test('returns false when participantsCount meets minParticipants', () => {
		expect(isPartialParticipation(build({ participantsCount: 200 }))).toBe(
			false,
		);
	});

	test('returns false when participantsCount equals minParticipants', () => {
		expect(isPartialParticipation(build({ participantsCount: 150 }))).toBe(
			false,
		);
	});

	test('returns false when minParticipants is 0 (threshold disabled)', () => {
		expect(
			isPartialParticipation(
				build({ minParticipants: 0, participantsCount: 5 }),
			),
		).toBe(false);
	});

	test('returns false when raffle is still live', () => {
		expect(
			isPartialParticipation(build({ status: 'live' as Raffle['status'] })),
		).toBe(false);
	});

	test('returns false when raffle is cancelled', () => {
		expect(
			isPartialParticipation(
				build({ status: 'cancelled' as Raffle['status'] }),
			),
		).toBe(false);
	});

	test('returns false when no winners (draw never happened)', () => {
		expect(isPartialParticipation(build({ winners: [] }))).toBe(false);
	});

	test('returns false when winners is undefined', () => {
		expect(isPartialParticipation(build({ winners: undefined }))).toBe(false);
	});
});

describe('computePayoutAmountPerWinner', () => {
	test('Weekly Prize $300 USDC case — 167.30 revenue, 3 winners → 55.2090 each', () => {
		expect(computePayoutAmountPerWinner('167.3000', 3)).toBe('55.2090');
		expect(computePayoutAmountPerWinner('167.30', 3)).toBe('55.2090');
		expect(computePayoutAmountPerWinner('167.3', 3)).toBe('55.2090');
	});

	test('zero revenue produces zero per winner', () => {
		expect(computePayoutAmountPerWinner('0', 3)).toBe('0.0000');
		expect(computePayoutAmountPerWinner('0.0000', 5)).toBe('0.0000');
	});

	test('1 winner takes 99% of revenue', () => {
		expect(computePayoutAmountPerWinner('100.0000', 1)).toBe('99.0000');
	});

	test('floor-truncation routes sub-unit remainder to platform', () => {
		// 10 / 3 = 3.30 each → total 9.90; revenue × 99% = 9.90; no remainder
		expect(computePayoutAmountPerWinner('10.0000', 3)).toBe('3.3000');
		// 10.0001 × 9900 / 10000 / 3 = 9.900099 / 3 = 3.300033 → floor at scale 4 = 3.3000
		expect(computePayoutAmountPerWinner('10.0001', 3)).toBe('3.3000');
	});

	test('returns null on invalid inputs', () => {
		expect(computePayoutAmountPerWinner('not a number', 3)).toBeNull();
		expect(computePayoutAmountPerWinner('100', 0)).toBeNull();
		expect(computePayoutAmountPerWinner('100', -1)).toBeNull();
		expect(computePayoutAmountPerWinner('100', 1.5)).toBeNull();
	});
});

describe('computeTotalDistributed', () => {
	test('multiplies per-winner amount by winner count', () => {
		expect(computeTotalDistributed('55.2090', 3)).toBe('165.6270');
	});

	test('handles zero', () => {
		expect(computeTotalDistributed('0.0000', 3)).toBe('0.0000');
	});
});

describe('computePlatformFee', () => {
	test('Weekly Prize case — 167.30 revenue − 165.627 distributed = 1.673 fee', () => {
		expect(computePlatformFee('167.3000', '165.6270')).toBe('1.6730');
	});

	test('zero revenue → zero fee', () => {
		expect(computePlatformFee('0.0000', '0.0000')).toBe('0.0000');
	});
});

describe('formatCredits', () => {
	test('trims trailing zeros at the display floor', () => {
		expect(formatCredits('55.2090')).toBe('55.21');
		expect(formatCredits('55.0000')).toBe('55');
		expect(formatCredits('1000.5000')).toBe('1,000.5');
	});

	test('returns input on non-numeric', () => {
		expect(formatCredits('abc')).toBe('abc');
	});
});
