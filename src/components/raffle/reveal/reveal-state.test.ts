import { describe, expect, test } from 'bun:test';

import { RAFFLE_STATUS, type Raffle, type RaffleWinner } from '@/types/raffle';
import type { Winning } from '@/types/winning';

import {
	buildParticipantSample,
	deriveOutcome,
	isRevealEligible,
	PARTICIPANT_SAMPLE_SIZE,
	resolveWinnerLabel,
	revealStorageKey,
	truncateOrbitLabel,
} from './reveal-state';

const ELIGIBLE_INPUT = {
	isConcluded: true,
	hasWinners: true,
	isCancelled: false,
	isOwner: false,
	isParticipant: true,
} as const;

const RAFFLE_FIXTURE: Pick<Raffle, 'id' | 'status' | 'winners'> = {
	id: 'rfl_abc123',
	status: RAFFLE_STATUS.LIVE,
	winners: undefined,
};

function makeRaffle(overrides: Partial<Raffle> = {}): Raffle {
	// Helper recasts the partial fixture to Raffle — the helpers under
	// test only read a handful of fields, so the rest of the Raffle
	// shape is intentionally absent.
	return { ...RAFFLE_FIXTURE, ...overrides } as Raffle;
}

function makeWinning(overrides: Partial<Winning> = {}): Winning {
	return {
		raffleId: 'rfl_abc123',
		position: 1,
		status: 'paid',
		...overrides,
	} as Winning;
}

function makeWinner(overrides: Partial<RaffleWinner> = {}): RaffleWinner {
	return {
		position: 1,
		name: 'Alice',
		status: 'paid',
		...overrides,
	} as RaffleWinner;
}

describe('buildParticipantSample', () => {
	test('returns exactly PARTICIPANT_SAMPLE_SIZE participants', () => {
		const sample = buildParticipantSample();
		expect(sample).toHaveLength(PARTICIPANT_SAMPLE_SIZE);
	});

	test('labels are unique within a sample (Fisher-Yates without replacement)', () => {
		// Sweep many trials — randomised picking must never duplicate a
		// handle inside the 7-card ring. If the without-replacement
		// invariant breaks (e.g. naïve random-index loop), trials hit
		// duplicates within a few iterations.
		for (let trial = 0; trial < 64; trial += 1) {
			const labels = buildParticipantSample().map(p => p.label);
			expect(new Set(labels).size).toBe(PARTICIPANT_SAMPLE_SIZE);
		}
	});

	test('stays cheap enough for the server-render path', () => {
		// `RaffleDrawCard` is a Server Component that calls this in its render
		// body on every drawing-raffle request, and the reveal dialog rebuilds
		// it on each replay mount. A CSPRNG-per-handle generator cost ~12ms per
		// handle (~84ms per sample), blowing a multi-second hole in SSR for a
		// purely decorative ring. Budget sits ~10x under the old cost and ~100x
		// over pure pool-sampling, so any regression to a crypto-backed
		// generator trips deterministically without flaking on a loaded CI box.
		const BUDGET_MS = 500;
		const start = performance.now();
		for (let trial = 0; trial < 64; trial += 1) {
			buildParticipantSample();
		}
		expect(performance.now() - start).toBeLessThan(BUDGET_MS);
	});

	test('two consecutive calls produce different label sets', () => {
		// Random selection guarantees variety across renders — the whole
		// point of the redesign. With a 20-handle pool and 7 picks, the
		// probability of two calls returning the same set in trial order
		// is vanishingly small (≈ 1 / C(20,7) per call, well below test
		// flake thresholds). A trivial constant-return regression would
		// fire every time.
		const a = buildParticipantSample().map(p => p.label);
		const b = buildParticipantSample().map(p => p.label);
		expect(a).not.toEqual(b);
	});
});

describe('truncateOrbitLabel', () => {
	test('prefixes labels at or below 8 chars with @', () => {
		expect(truncateOrbitLabel('sofia')).toBe('@sofia');
		expect(truncateOrbitLabel('jordan')).toBe('@jordan');
		// 8-char boundary — the limit itself is not truncated.
		expect(truncateOrbitLabel('sarahkim')).toBe('@sarahkim');
	});

	test('truncates to 8 chars + ellipsis with @ prefix when longer', () => {
		expect(truncateOrbitLabel('sarahkimm')).toBe('@sarahkim...');
		expect(truncateOrbitLabel('emilydavis')).toBe('@emilydav...');
		expect(truncateOrbitLabel('kavinpatel')).toBe('@kavinpat...');
	});

	test('prefixes empty string with @', () => {
		expect(truncateOrbitLabel('')).toBe('@');
	});
});

describe('deriveOutcome', () => {
	test('returns pending while the raffle is still LIVE', () => {
		const outcome = deriveOutcome({
			raffle: makeRaffle({ status: RAFFLE_STATUS.LIVE }),
			myWinning: null,
			hasWinners: false,
		});
		expect(outcome).toBe('pending');
	});

	test('returns pending when COMPLETED but winners not yet written', () => {
		// Race window — raffle status flipped but `winnings` rows aren't
		// hydrated on the page yet. Must keep the orbit spinning rather
		// than declaring everyone a loser.
		const outcome = deriveOutcome({
			raffle: makeRaffle({ status: RAFFLE_STATUS.COMPLETED }),
			myWinning: null,
			hasWinners: false,
		});
		expect(outcome).toBe('pending');
	});

	test('returns pending during FULFILLING even if winners array is populated', () => {
		// Stale client/cache may briefly show winners while status is still
		// `fulfilling`; backend treats that status as pre-commit. Do not
		// flash winner/loser until `completed`.
		const outcome = deriveOutcome({
			raffle: makeRaffle({
				status: RAFFLE_STATUS.FULFILLING,
				winners: [makeWinner()],
			}),
			myWinning: makeWinning(),
			hasWinners: true,
		});
		expect(outcome).toBe('pending');
	});

	test('returns pending while ENDED with no winners', () => {
		const outcome = deriveOutcome({
			raffle: makeRaffle({ status: RAFFLE_STATUS.ENDED, winners: [] }),
			myWinning: null,
			hasWinners: false,
		});
		expect(outcome).toBe('pending');
	});

	test('returns winner when COMPLETED with a personal winning record', () => {
		const outcome = deriveOutcome({
			raffle: makeRaffle({ status: RAFFLE_STATUS.COMPLETED }),
			myWinning: makeWinning(),
			hasWinners: true,
		});
		expect(outcome).toBe('winner');
	});

	test('returns loser when COMPLETED with winners but none belong to me', () => {
		const outcome = deriveOutcome({
			raffle: makeRaffle({ status: RAFFLE_STATUS.COMPLETED }),
			myWinning: null,
			hasWinners: true,
		});
		expect(outcome).toBe('loser');
	});
});

describe('resolveWinnerLabel', () => {
	test('returns the generic placeholder when winner is null', () => {
		expect(resolveWinnerLabel(null)).toBe('A lucky entrant');
	});

	test('uses the trimmed name when present', () => {
		expect(resolveWinnerLabel(makeWinner({ name: '  Sofia  ' }))).toBe('Sofia');
	});

	test('falls back to Entry #N for whitespace-only names', () => {
		// `winner.name` arrives from user input — backend may store an
		// empty/whitespace handle. Whitespace-trimmed empty must not
		// render as a blank winner card.
		expect(resolveWinnerLabel(makeWinner({ name: '   ', position: 4 }))).toBe(
			'Entry #4',
		);
	});

	test('falls back to Entry #N for null names', () => {
		expect(resolveWinnerLabel(makeWinner({ name: null, position: 2 }))).toBe(
			'Entry #2',
		);
	});
});

describe('isRevealEligible', () => {
	test('true for a concluded, winners-selected participant', () => {
		expect(isRevealEligible(ELIGIBLE_INPUT)).toBe(true);
	});

	test('false while the raffle is not concluded', () => {
		expect(isRevealEligible({ ...ELIGIBLE_INPUT, isConcluded: false })).toBe(
			false,
		);
	});

	test('false during the pre-winner draw window (concluded, no winners)', () => {
		// Load-bearing guard — the intro reads "The winner is in!", so it must
		// stay hidden until VRF writes winners. Regression-protects the gate.
		expect(isRevealEligible({ ...ELIGIBLE_INPUT, hasWinners: false })).toBe(
			false,
		);
	});

	test('false for a cancelled raffle', () => {
		expect(isRevealEligible({ ...ELIGIBLE_INPUT, isCancelled: true })).toBe(
			false,
		);
	});

	test('false for the host (owner never sees the reveal gate)', () => {
		expect(isRevealEligible({ ...ELIGIBLE_INPUT, isOwner: true })).toBe(false);
	});

	test('false for a non-participant viewer', () => {
		expect(isRevealEligible({ ...ELIGIBLE_INPUT, isParticipant: false })).toBe(
			false,
		);
	});
});

describe('revealStorageKey', () => {
	test('namespaces the reveal-seen flag by raffle id', () => {
		expect(revealStorageKey('rfl_abc')).toBe('raffly:reveal-seen:rfl_abc');
		expect(revealStorageKey('rfl_xyz')).toBe('raffly:reveal-seen:rfl_xyz');
	});
});
