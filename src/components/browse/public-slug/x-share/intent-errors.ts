/**
 * Maps backend error codes from `createXShareIntent` to user-friendly toast
 * messages. Every APIError code from CreateXShareIntentCommand is covered —
 * no silent fallbacks.
 *
 * Kept separate from `verify-errors.ts` because the two flows surface
 * distinct code sets (intent-specific: already-claimed, question-required;
 * verify-specific: expired, not-found, sold-out). Shared codes
 * (network/timeout/ratelimit/disabled) are intentionally duplicated rather
 * than hoisted into a shared base — the duplication is tiny and keeps each
 * mapper self-contained for the reader.
 */

// Fallback when the backend returns an unmapped code. Kept generic so we
// never leak raw `core:*` slugs to the user (see error-handling.md).
const INTENT_GENERIC_FALLBACK = 'Something went wrong. Please try again.';

/**
 * Resolves a user-facing toast message for an X share intent failure.
 *
 * @param errorCode - The ServiceResponse error code from `createXShareIntent`.
 * @returns A user-facing message safe to render in a toast.
 */
export function getIntentErrorMessage(errorCode: string): string {
	switch (errorCode) {
		case 'core:xshare:already-claimed':
			// Backend collapsed the claim status to `pending | verified`;
			// this code now means a verified claim already exists for the
			// (raffle, user) pair. The share button should be disabled before
			// the call fires — this is a fallback for stale frontend state
			// (e.g. claim verified in another tab).
			return 'Already claimed bonus entry.';
		case 'core:xshare:question-required':
			return 'Answer the sweepstakes check-in question first to unlock sharing.';
		case 'core:xshare:disabled':
			return 'Bonus-entry sharing is not available for this sweepstakes.';
		case 'core:raffle:not-live':
			return 'This sweepstakes is no longer active.';
		case 'core:raffle:not-found':
			return 'This sweepstakes no longer exists.';
		// Endpoint-level rate limit (30/min on write tier).
		case 'global:ratelimit:exceeded':
			return 'Too many requests — please wait a moment and try again.';
		// Network / timeout — actionable fallback so users know to retry.
		case 'network_error':
			return 'Network issue — check your connection and try again.';
		case 'timeout_error':
			return 'Request timed out — please try again.';
		default:
			return INTENT_GENERIC_FALLBACK;
	}
}
