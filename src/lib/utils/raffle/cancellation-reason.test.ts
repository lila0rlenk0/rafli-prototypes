import { describe, expect, test } from 'bun:test';

import type { RaffleStatus } from '@/types/raffle';
import {
	CANCELLATION_REASON,
	type CancellationReason,
	getCancellationReason,
	isAutoReason,
	isAutoCancelled,
} from './cancellation-reason';

/** Past date guaranteed to be before "now" */
const PAST_END = '2020-01-01T00:00:00Z';

/** Future date guaranteed to be after "now" */
const FUTURE_END = '2099-01-01T00:00:00Z';

/**
 * Builds a cancelled raffle fixture with sensible defaults.
 * Override individual fields as needed per test case.
 */
function buildCancelledRaffle(
	overrides: Partial<{
		status: RaffleStatus;
		endAt: string;
		ticketsSoldCount: number;
		participantsCount: number;
		numberOfWinners: number;
		minParticipants: number;
		vrfRequestId: string | null;
		cancellationReason: CancellationReason | null;
	}> = {},
) {
	return {
		status: 'cancelled' as RaffleStatus,
		endAt: PAST_END,
		ticketsSoldCount: 10,
		participantsCount: 5,
		numberOfWinners: 1,
		minParticipants: 10,
		vrfRequestId: null as string | null,
		cancellationReason: null as CancellationReason | null,
		...overrides,
	};
}

describe('getCancellationReason', () => {
	test('returns null for non-cancelled raffle', () => {
		const raffle = buildCancelledRaffle({ status: 'live' });
		expect(getCancellationReason(raffle)).toBeNull();
	});

	test('returns no_tickets when raffle expired with zero tickets sold', () => {
		const raffle = buildCancelledRaffle({
			ticketsSoldCount: 0,
			participantsCount: 0,
		});
		expect(getCancellationReason(raffle)).toBe(CANCELLATION_REASON.NO_TICKETS);
	});

	test('returns insufficient_participants when fewer participants than winners needed', () => {
		const raffle = buildCancelledRaffle({
			participantsCount: 2,
			numberOfWinners: 3,
			minParticipants: 10,
		});
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.INSUFFICIENT_PARTICIPANTS,
		);
	});

	test('returns partial_participation when enough for draw but below minParticipants', () => {
		// 5 participants >= 3 winners, but < 10 minParticipants
		const raffle = buildCancelledRaffle({
			participantsCount: 5,
			numberOfWinners: 3,
			minParticipants: 10,
		});
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.PARTIAL_PARTICIPATION,
		);
	});

	test('returns partial_participation at exact numberOfWinners boundary', () => {
		// participantsCount === numberOfWinners, still below minParticipants
		const raffle = buildCancelledRaffle({
			participantsCount: 3,
			numberOfWinners: 3,
			minParticipants: 10,
		});
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.PARTIAL_PARTICIPATION,
		);
	});

	test('returns host_cancelled when raffle has not ended yet', () => {
		const raffle = buildCancelledRaffle({ endAt: FUTURE_END });
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.HOST_CANCELLED,
		);
	});

	test('returns host_cancelled when VRF draw was attempted', () => {
		const raffle = buildCancelledRaffle({ vrfRequestId: 'vrf-123' });
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.HOST_CANCELLED,
		);
	});

	test('returns host_cancelled when participants meet minParticipants', () => {
		// 10 participants >= 10 minParticipants — should not be partial_participation
		const raffle = buildCancelledRaffle({
			participantsCount: 10,
			numberOfWinners: 3,
			minParticipants: 10,
		});
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.HOST_CANCELLED,
		);
	});

	test('prefers backend cancellationReason over heuristic', () => {
		// Backend returns the authoritative reason — heuristic should not override it.
		const raffle = buildCancelledRaffle({
			cancellationReason: 'host_cancelled',
			// Heuristic signals that would infer partial_participation, but backend says host
			participantsCount: 5,
			numberOfWinners: 3,
			minParticipants: 10,
		});
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.HOST_CANCELLED,
		);
	});

	test('returns admin_rejected from backend field', () => {
		// admin_rejected can only come from the backend field — heuristic can't detect it
		const raffle = buildCancelledRaffle({
			cancellationReason: CANCELLATION_REASON.ADMIN_REJECTED,
		});
		expect(getCancellationReason(raffle)).toBe(
			CANCELLATION_REASON.ADMIN_REJECTED,
		);
	});

	test('falls back to heuristic when backend field is null', () => {
		// Cached responses or old data may not have the field
		const raffle = buildCancelledRaffle({
			cancellationReason: null,
			ticketsSoldCount: 0,
			participantsCount: 0,
		});
		expect(getCancellationReason(raffle)).toBe(CANCELLATION_REASON.NO_TICKETS);
	});
});

describe('isAutoReason', () => {
	test('no_tickets is auto', () => {
		expect(isAutoReason(CANCELLATION_REASON.NO_TICKETS)).toBe(true);
	});

	test('insufficient_participants is auto', () => {
		expect(isAutoReason(CANCELLATION_REASON.INSUFFICIENT_PARTICIPANTS)).toBe(
			true,
		);
	});

	test('partial_participation is auto', () => {
		expect(isAutoReason(CANCELLATION_REASON.PARTIAL_PARTICIPATION)).toBe(true);
	});

	test('host_cancelled is not auto', () => {
		expect(isAutoReason(CANCELLATION_REASON.HOST_CANCELLED)).toBe(false);
	});

	test('admin_rejected is not auto', () => {
		expect(isAutoReason(CANCELLATION_REASON.ADMIN_REJECTED)).toBe(false);
	});
});

describe('isAutoCancelled', () => {
	test('returns true for partial_participation raffle', () => {
		const raffle = buildCancelledRaffle({
			participantsCount: 5,
			numberOfWinners: 3,
			minParticipants: 10,
		});
		expect(isAutoCancelled(raffle)).toBe(true);
	});

	test('returns false for non-cancelled raffle', () => {
		const raffle = buildCancelledRaffle({ status: 'live' });
		expect(isAutoCancelled(raffle)).toBe(false);
	});
});
