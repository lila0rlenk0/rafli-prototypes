import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';

// ==========================================
// Constants
// ==========================================

export const CANCELLATION_REASON = {
	ADMIN_REJECTED: 'admin_rejected',
	HOST_CANCELLED: 'host_cancelled',
	NO_TICKETS: 'no_tickets',
	INSUFFICIENT_PARTICIPANTS: 'insufficient_participants',
	/** Below minParticipants but had enough for a draw — cancelled instead of partial revenue share */
	PARTIAL_PARTICIPATION: 'partial_participation',
} as const;

export type CancellationReason =
	(typeof CANCELLATION_REASON)[keyof typeof CANCELLATION_REASON];

// ==========================================
// Core Logic
// ==========================================

type CancellationRaffle = Pick<
	Raffle,
	| 'status'
	| 'endAt'
	| 'ticketsSoldCount'
	| 'participantsCount'
	| 'numberOfWinners'
	| 'minParticipants'
	| 'vrfRequestId'
	| 'cancellationReason'
>;

/**
 * Heuristic — infer an auto-cancel reason for cached raffle responses
 * that predate the backend `cancellationReason` field. Returns `null`
 * when none of the auto-cancel signatures match, so the caller falls
 * back to the generic host-cancelled bucket.
 */
function inferAutoCancellationReason(
	raffle: CancellationRaffle,
): CancellationReason | null {
	const isPastEnd = new Date(raffle.endAt) <= new Date();
	const hadNoVrfDraw = !raffle.vrfRequestId;
	if (!isPastEnd || !hadNoVrfDraw) return null;

	if (raffle.ticketsSoldCount === 0) {
		return CANCELLATION_REASON.NO_TICKETS;
	}
	if (raffle.participantsCount < raffle.numberOfWinners) {
		return CANCELLATION_REASON.INSUFFICIENT_PARTICIPANTS;
	}
	if (raffle.participantsCount < raffle.minParticipants) {
		return CANCELLATION_REASON.PARTIAL_PARTICIPATION;
	}
	return null;
}

/**
 * Resolves why a raffle was cancelled.
 *
 * Prefers the backend-supplied `cancellationReason` field (authoritative).
 * Falls back to a heuristic for cached responses that predate the field.
 *
 * @param raffle - The raffle to inspect
 * @returns The cancellation reason, or null if not cancelled
 */
export function getCancellationReason(
	raffle: CancellationRaffle,
): CancellationReason | null {
	// Step 1: Guard — only cancelled raffles have a cancellation reason.
	if (raffle.status !== RAFFLE_STATUS.CANCELLED) return null;

	// Step 2: Prefer authoritative backend field when available.
	// Covers admin_rejected and all other reasons the heuristic can't detect.
	if (raffle.cancellationReason) {
		return raffle.cancellationReason;
	}

	// Step 3: Heuristic fallback for cached responses without the field.
	return (
		inferAutoCancellationReason(raffle) ?? CANCELLATION_REASON.HOST_CANCELLED
	);
}

/**
 * Whether a cancellation reason is system-initiated (not host-initiated).
 * Single source of truth — use this instead of ad-hoc reason checks.
 *
 * @param reason - The cancellation reason to inspect
 * @returns true if auto-cancelled by the system
 */
export function isAutoReason(reason: CancellationReason): boolean {
	return (
		reason === CANCELLATION_REASON.NO_TICKETS ||
		reason === CANCELLATION_REASON.INSUFFICIENT_PARTICIPANTS ||
		reason === CANCELLATION_REASON.PARTIAL_PARTICIPATION
	);
}

/**
 * Whether the raffle was auto-cancelled by the system (not by the host).
 * Convenience wrapper over getCancellationReason + isAutoReason for callers
 * that only have a raffle object, not a pre-computed reason.
 *
 * Note: heuristic compares endAt against "now" — a host cancelling after
 * expiry but before the system auto-cancel job would be mis-classified.
 *
 * @param raffle - The raffle to inspect
 * @returns true if system auto-cancelled, false otherwise
 */
export function isAutoCancelled(
	raffle: Parameters<typeof getCancellationReason>[0],
): boolean {
	const reason = getCancellationReason(raffle);
	if (!reason) return false;
	return isAutoReason(reason);
}
