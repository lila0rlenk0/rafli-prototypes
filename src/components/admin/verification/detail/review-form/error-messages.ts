/** Lookup — review error code → admin-friendly copy. */
const MESSAGES: Record<string, string> = {
	'core:verification:already-reviewed':
		'This submission was already reviewed by another admin.',
	'core:verification:self-review': 'You cannot review your own submission.',
	'core:verification:not-pending':
		'This submission is no longer in pending status.',
	'core:verification:not-finalized':
		'This submission has not been finalized yet.',
	forbidden: 'You do not have permission to review submissions.',
};

/**
 * Maps review error codes to admin-friendly messages, surfacing the
 * backend reason instead of a generic "Failed to X" string.
 *
 * @returns A readable message, falling back to a retry prompt.
 */
export function getReviewErrorMessage(
	action: 'approve' | 'reject',
	code: string,
): string {
	return MESSAGES[code] ?? `Failed to ${action} submission. Please try again.`;
}
