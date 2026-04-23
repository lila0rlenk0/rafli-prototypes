import type { RaffleErrorCode } from '@/types/errors';

/** Lookup — raffle question error code → user-facing toast copy. */
const MESSAGES: Partial<Record<RaffleErrorCode, string>> = {
	'core:raffle:question-not-found': 'Question not found for this sweepstakes',
	'core:option:not-found': 'Selected option not found',
	'core:option:invalid': 'Invalid option selected',
	network_error: 'Network error. Please check your connection',
	timeout_error: 'Request timed out. Please try again',
	'global:auth:unauthenticated': 'Please sign in to continue',
	unauthorized: 'Please sign in to continue',
	'global:ratelimit:exceeded': 'Too many attempts. Please wait a moment',
};

/**
 * Maps raffle question error codes to user-friendly strings.
 *
 * @returns A readable message, falling back to a generic retry prompt.
 */
export function getQuestionErrorMessage(errorCode: RaffleErrorCode): string {
	return MESSAGES[errorCode] ?? 'An error occurred. Please try again';
}
