import { describe, expect, test } from 'bun:test';

import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';

import { applyPhaseToRaffle, SIM_PHASE } from './phases';

function makeRaffle(overrides: Partial<Raffle> = {}): Raffle {
	return {
		id: 'rfl_sim',
		status: RAFFLE_STATUS.LIVE,
		winners: undefined,
		endAt: new Date(Date.now() + 60_000).toISOString(),
		...overrides,
	} as Raffle;
}

describe('applyPhaseToRaffle', () => {
	test('drawing and fulfilling both leave winners empty', () => {
		const drawing = applyPhaseToRaffle(makeRaffle(), SIM_PHASE.DRAWING);
		const fulfilling = applyPhaseToRaffle(makeRaffle(), SIM_PHASE.FULFILLING);

		expect(drawing.status).toBe(RAFFLE_STATUS.ENDED);
		expect(drawing.winners).toEqual([]);
		expect(fulfilling.status).toBe(RAFFLE_STATUS.FULFILLING);
		expect(fulfilling.winners).toEqual([]);
	});

	test('every Phase E variant uses completed status with synthetic winners', () => {
		// Direct end-state previews and their reveal-flow counterparts share
		// the same concluded raffle shape — the outcome split lives elsewhere.
		for (const phase of [
			SIM_PHASE.WINNER,
			SIM_PHASE.LOSER,
			SIM_PHASE.REVEAL_WIN,
			SIM_PHASE.REVEAL_LOSE,
		]) {
			const result = applyPhaseToRaffle(makeRaffle(), phase);
			expect(result.status).toBe(RAFFLE_STATUS.COMPLETED);
			expect(result.winners?.length).toBe(1);
		}
	});
});
