/**
 * Client-side validation errors — occur before the API is called.
 * Use the "client:" prefix to differentiate from backend errors.
 */
export const CLIENT_ERROR_CODES = {
	// Raffle validation errors
	RAFFLE_INVALID_CATEGORY: 'client:raffle:invalid-category',

	// Upload validation errors (before API call)
	UPLOAD_INVALID_TYPE: 'client:upload:invalid-type',
	UPLOAD_TOO_LARGE: 'client:upload:too-large',
	UPLOAD_TOO_MANY_FILES: 'client:upload:too-many-files',
} as const;

export type ClientErrorCode =
	(typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];
