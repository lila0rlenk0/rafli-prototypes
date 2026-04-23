/**
 * Maps backend error codes from `verifyXShare` to user-friendly toast
 * messages. Every APIError code from VerifyXShareCommand is covered.
 *
 * Kept separate from `intent-errors.ts` — the two flows own distinct
 * code sets (see note in `intent-errors.ts`). Shared codes are
 * duplicated intentionally.
 */

// Fallback when the backend returns an unmapped code. Slightly more
// specific wording than the intent fallback so users know the failure
// happened during verification, not share creation.
const VERIFY_GENERIC_FALLBACK = 'Verification failed. Please try again.';

/**
 * Resolves a user-facing toast message for an X share verify failure.
 *
 * @param errorCode - The ServiceResponse error code from `verifyXShare`.
 * @returns A user-facing message safe to render in a toast.
 */
export function getVerifyErrorMessage(errorCode: string): string {
	switch (errorCode) {
		case 'core:xshare:expired':
			return 'Your share link has expired. Each sweepstakes allows one bonus-entry share attempt.';
		case 'core:xshare:rate-limited':
			return 'Please wait a few seconds before trying again.';
		case 'core:xshare:not-found':
			return 'No share claim found. Tap "Share on X" to start.';
		case 'core:xshare:disabled':
			return 'Bonus-entry sharing was turned off for this sweepstakes.';
		case 'core:raffle:not-live':
			return 'This sweepstakes is no longer active.';
		case 'core:raffle:not-found':
			return 'This sweepstakes no longer exists.';
		case 'core:raffle:sold-out':
			return 'This sweepstakes is sold out — no more entries available.';
		// Endpoint-level rate limit (5/min on strict tier).
		case 'global:ratelimit:exceeded':
			return 'Too many requests — please wait a moment and try again.';
		case 'network_error':
			return 'Network issue — check your connection and try again.';
		case 'timeout_error':
			return 'Request timed out — please try again.';
		default:
			return VERIFY_GENERIC_FALLBACK;
	}
}
