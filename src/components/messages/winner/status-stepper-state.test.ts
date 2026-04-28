import { describe, expect, test } from 'bun:test';

import { WINNING_STATUS } from '@/types/winning';

import {
	findMainPathIndex,
	getDisputeStepState,
	getMainStepState,
} from './status-stepper-state';

/**
 * Mainline length is fixed at 5 (pending → awaiting_host → sent →
 * delivered → received). Pinned as a constant so the tests read like the
 * caller (status-stepper.tsx passes MAIN_PATH_STEPS.length) — if the
 * mainline ever grows, both call-sites move together.
 */
const MAIN_PATH_LENGTH = 5;

describe('findMainPathIndex', () => {
	test('pending → 0', () => {
		expect(findMainPathIndex(WINNING_STATUS.PENDING)).toBe(0);
	});

	test('legacy pending_partial_fulfillment collapses to the pending index', () => {
		// Historic DB rows must still land on the rail rather than -1, which
		// would force the renderer into the dispute branch unintentionally.
		expect(findMainPathIndex(WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT)).toBe(
			0,
		);
	});

	test('terminal mainline (received) → 4', () => {
		expect(findMainPathIndex(WINNING_STATUS.RECEIVED)).toBe(4);
	});

	test('disputed → -1 so the caller switches to the dispute branch layout', () => {
		expect(findMainPathIndex(WINNING_STATUS.DISPUTED)).toBe(-1);
	});

	test('resolved → -1 (same dispute-branch sentinel)', () => {
		expect(findMainPathIndex(WINNING_STATUS.RESOLVED)).toBe(-1);
	});
});

describe('getMainStepState', () => {
	describe('mid-flow progression (sanity)', () => {
		// currentMainIndex = 2 corresponds to the `sent` step. Earlier rows
		// must paint completed, the row itself current, later rows upcoming.
		test('row before the current index is completed', () => {
			expect(
				getMainStepState({
					index: 0,
					currentMainIndex: 2,
					mainPathLength: MAIN_PATH_LENGTH,
					inDisputeBranch: false,
				}),
			).toBe('completed');
		});

		test('row at the current index is current', () => {
			expect(
				getMainStepState({
					index: 2,
					currentMainIndex: 2,
					mainPathLength: MAIN_PATH_LENGTH,
					inDisputeBranch: false,
				}),
			).toBe('current');
		});

		test('row after the current index is upcoming', () => {
			expect(
				getMainStepState({
					index: 4,
					currentMainIndex: 2,
					mainPathLength: MAIN_PATH_LENGTH,
					inDisputeBranch: false,
				}),
			).toBe('upcoming');
		});
	});

	describe('terminal-happy carve-out (regression)', () => {
		// Regression: when the winner has confirmed receipt, currentMainIndex
		// equals mainPathLength - 1 (the terminal `received` step). The flow
		// is over — no actor has a next move. Painting that row as `current`
		// (ringed dot) borrows the "action pending here" affordance from
		// in-flight steps and contradicts its own description ("Prize
		// received. Case closed."). Every mainline row, including the
		// terminal one, must collapse to `completed` so the rail reads as a
		// finished arc.
		test('terminal index renders the terminal row itself as completed (NOT current)', () => {
			expect(
				getMainStepState({
					index: MAIN_PATH_LENGTH - 1,
					currentMainIndex: MAIN_PATH_LENGTH - 1,
					mainPathLength: MAIN_PATH_LENGTH,
					inDisputeBranch: false,
				}),
			).toBe('completed');
		});

		test('terminal index also renders every preceding row as completed', () => {
			// Loop bound is exclusive of the terminal index because the
			// previous test already pins that row's expected state. We only
			// need to confirm the carve-out doesn't accidentally leave
			// earlier rows in `current` / `upcoming` once we've reached the
			// end of the rail.
			for (let index = 0; index < MAIN_PATH_LENGTH - 1; index++) {
				expect(
					getMainStepState({
						index,
						currentMainIndex: MAIN_PATH_LENGTH - 1,
						mainPathLength: MAIN_PATH_LENGTH,
						inDisputeBranch: false,
					}),
				).toBe('completed');
			}
		});
	});

	describe('dispute branch override', () => {
		// When the winning is in dispute, every mainline row paints as
		// completed regardless of where the flow actually was — the dispute
		// branch is rendered separately underneath. The override must short-
		// circuit even at the terminal index, so this case overlaps with the
		// carve-out above on purpose.
		test('inDisputeBranch=true forces every mainline row to completed', () => {
			for (let index = 0; index < MAIN_PATH_LENGTH; index++) {
				expect(
					getMainStepState({
						index,
						currentMainIndex: -1,
						mainPathLength: MAIN_PATH_LENGTH,
						inDisputeBranch: true,
					}),
				).toBe('completed');
			}
		});
	});
});

describe('getDisputeStepState', () => {
	// Exhaustively covers the 2x2 of (row status × current status) inside
	// the dispute branch — small enough that an explicit table beats a
	// loop, and the cases double as documentation of the only legal
	// transition (`disputed` → `resolved`).
	test('row matching the current status is current', () => {
		expect(
			getDisputeStepState({
				status: WINNING_STATUS.DISPUTED,
				currentStatus: WINNING_STATUS.DISPUTED,
			}),
		).toBe('current');
	});

	test('disputed row becomes completed once resolved is reached', () => {
		expect(
			getDisputeStepState({
				status: WINNING_STATUS.DISPUTED,
				currentStatus: WINNING_STATUS.RESOLVED,
			}),
		).toBe('completed');
	});

	test('resolved row stays upcoming while still disputed', () => {
		expect(
			getDisputeStepState({
				status: WINNING_STATUS.RESOLVED,
				currentStatus: WINNING_STATUS.DISPUTED,
			}),
		).toBe('upcoming');
	});

	test('resolved row at resolved is current (terminal of dispute branch)', () => {
		expect(
			getDisputeStepState({
				status: WINNING_STATUS.RESOLVED,
				currentStatus: WINNING_STATUS.RESOLVED,
			}),
		).toBe('current');
	});
});
