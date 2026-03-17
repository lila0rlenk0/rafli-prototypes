import { describe, expect, test } from 'bun:test';

import {
	AUTO_REFRESH_TIMEOUT_MS,
	RAFFLE_AUTO_REFRESH_PHASE,
	resolveRaffleAutoRefreshPhase,
} from './raffle-auto-refresh-state';
import { RAFFLE_STATUS } from '@/types/raffle';

describe('resolveRaffleAutoRefreshPhase', () => {
	test('does not poll live raffles before endAt', () => {
		expect(
			resolveRaffleAutoRefreshPhase({
				status: RAFFLE_STATUS.LIVE,
				endAt: '2030-01-01T00:00:00.000Z',
				hasWinners: false,
				now: new Date('2029-12-31T23:59:00.000Z'),
			}),
		).toBeNull();
	});

	test('polls live raffles after endAt while waiting for status flip', () => {
		expect(
			resolveRaffleAutoRefreshPhase({
				status: RAFFLE_STATUS.LIVE,
				endAt: '2030-01-01T00:00:00.000Z',
				hasWinners: false,
				now: new Date('2030-01-01T00:01:00.000Z'),
			}),
		).toBe(RAFFLE_AUTO_REFRESH_PHASE.AWAITING_STATUS_FLIP);
	});

	test('polls ended raffles without winners while waiting for draw output', () => {
		expect(
			resolveRaffleAutoRefreshPhase({
				status: RAFFLE_STATUS.ENDED,
				endAt: '2030-01-01T00:00:00.000Z',
				hasWinners: false,
			}),
		).toBe(RAFFLE_AUTO_REFRESH_PHASE.AWAITING_WINNERS);
	});

	test('stops polling ended raffles once winners exist', () => {
		expect(
			resolveRaffleAutoRefreshPhase({
				status: RAFFLE_STATUS.ENDED,
				endAt: '2030-01-01T00:00:00.000Z',
				hasWinners: true,
			}),
		).toBeNull();
	});

	test('polls fulfilling raffles while waiting for final completion', () => {
		expect(
			resolveRaffleAutoRefreshPhase({
				status: RAFFLE_STATUS.FULFILLING,
				endAt: '2030-01-01T00:00:00.000Z',
				hasWinners: true,
			}),
		).toBe(RAFFLE_AUTO_REFRESH_PHASE.AWAITING_COMPLETION);
	});
});

describe('AUTO_REFRESH_TIMEOUT_MS', () => {
	test('keeps explicit timeout budgets per phase', () => {
		expect(AUTO_REFRESH_TIMEOUT_MS).toEqual({
			[RAFFLE_AUTO_REFRESH_PHASE.AWAITING_STATUS_FLIP]: 600_000,
			[RAFFLE_AUTO_REFRESH_PHASE.AWAITING_WINNERS]: 900_000,
			[RAFFLE_AUTO_REFRESH_PHASE.AWAITING_COMPLETION]: 120_000,
		});
	});
});
