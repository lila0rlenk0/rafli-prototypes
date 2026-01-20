/**
 * Client-Side Validation Error Codes
 *
 * These errors occur during client-side validation BEFORE calling the API.
 * They use the "client:" prefix to differentiate them from backend errors.
 */

/**
 * Client-side validation error codes
 */
export const CLIENT_ERROR_CODES = {
	// Raffle validation errors
	RAFFLE_INVALID_CATEGORY: 'client:raffle:invalid-category',
	RAFFLE_INVALID_CHECK_IN_QUESTION: 'client:raffle:invalid-check-in-question',

	// Upload validation errors (before API call)
	UPLOAD_INVALID_TYPE: 'client:upload:invalid-type',
	UPLOAD_TOO_LARGE: 'client:upload:too-large',
	UPLOAD_TOO_MANY_FILES: 'client:upload:too-many-files',
} as const;

/**
 * Type representing all possible client-side validation error codes
 */
export type ClientErrorCode =
	(typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];
