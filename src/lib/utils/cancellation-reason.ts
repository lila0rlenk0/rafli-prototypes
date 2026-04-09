import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';

// ==========================================
// Constants
// ==========================================

export const CANCELLATION_REASON = {
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

/**
 * Infers why a raffle was cancelled from existing fields.
 *
 * Detection heuristic (no backend changes needed):
 * - `no_tickets`: ended with zero tickets sold, no VRF draw attempted
 * - `insufficient_participants`: ended with some tickets but fewer unique
 *   participants than winners needed, no VRF draw attempted
 * - `partial_participation`: enough participants for a draw but below
 *   minParticipants — cancelled instead of partial revenue share
 * - `host_cancelled`: all other cancellations (manual action by host)
 *
 * @param raffle - The raffle to inspect
 * @returns The cancellation reason, or null if not cancelled
 */
export function getCancellationReason(
	raffle: Pick<
		Raffle,
		| 'status'
		| 'endAt'
		| 'ticketsSoldCount'
		| 'participantsCount'
		| 'numberOfWinners'
		| 'minParticipants'
		| 'vrfRequestId'
	>,
): CancellationReason | null {
	// Step 1: Guard — only cancelled raffles have a cancellation reason.
	if (raffle.status !== RAFFLE_STATUS.CANCELLED) return null;

	// Step 2: Derive heuristic signals from existing fields.
	const isPastEnd = new Date(raffle.endAt) <= new Date();
	const hadNoVrfDraw = !raffle.vrfRequestId;

	// Step 3: Match against known auto-cancel scenarios (most specific first).
	// Auto-cancel: raffle expired with zero tickets sold
	if (isPastEnd && raffle.ticketsSoldCount === 0 && hadNoVrfDraw) {
		return CANCELLATION_REASON.NO_TICKETS;
	}

	// Auto-cancel: raffle expired but not enough unique participants for a draw
	if (
		isPastEnd &&
		raffle.participantsCount < raffle.numberOfWinners &&
		hadNoVrfDraw
	) {
		return CANCELLATION_REASON.INSUFFICIENT_PARTICIPANTS;
	}

	// Auto-cancel: enough participants for a draw but below minParticipants threshold.
	// Backend now cancels instead of proceeding with partial revenue share.
	if (
		isPastEnd &&
		raffle.participantsCount >= raffle.numberOfWinners &&
		raffle.participantsCount < raffle.minParticipants &&
		hadNoVrfDraw
	) {
		return CANCELLATION_REASON.PARTIAL_PARTICIPATION;
	}

	return CANCELLATION_REASON.HOST_CANCELLED;
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
