import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type {
	MerkleProof,
	RaffleVerificationPayload,
	TicketVerification,
	WinnerVerification,
} from '@/types/verification';

/** Aggregated payload from all verification API calls */
export interface TicketVerificationStoryPayload {
	ticket: TicketVerification;
	proof: MerkleProof | null;
	raffle: RaffleVerificationPayload | null;
	/**
	 * Winner formula — for the ticket's own position (if winner)
	 * or 1st place / position 0 (if not winner), to show the math.
	 */
	drawFormula: WinnerVerification | null;
}

/**
 * Maps verification error codes to user-friendly messages.
 * @returns Human-readable error description
 */
export function getVerificationStoryErrorMessage(
	code: VerificationErrorCode,
): string {
	switch (code) {
		case VERIFICATION_ERROR_CODES.TICKET_NOT_FOUND:
			return 'Entry not found. Double-check your entry code and sweepstakes ID.';
		// Backend emits either `no-vrf-data` (VRF still pending) or
		// `not-completed` (status guard). Both map to the same user message.
		case VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED:
		case VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED_ALT:
			return "This sweepstakes hasn't been drawn yet. Verification is available after the draw.";
		case VERIFICATION_ERROR_CODES.PROOF_NOT_FOUND:
			return 'Merkle proof not available for this entry.';
		case 'validation_error':
			return 'Unexpected response from the server.';
		case 'network_error':
			return 'Network error. Check your connection and try again.';
		default:
			return 'Something went wrong. Please try again.';
	}
}

/**
 * Truncates long hex/number strings for display.
 * Preserves start and end for recognizability.
 * @returns Truncated string like "10566577...397731"
 */
export function truncateVerificationHash(
	value: string,
	maxLength = 24,
): string {
	if (value.length <= maxLength) return value;
	const keep = Math.floor((maxLength - 3) / 2);
	return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}
