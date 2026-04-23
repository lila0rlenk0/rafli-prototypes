import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';

/**
 * Lookup: auth/common error code → user-facing copy. `USER_ALREADY_EXISTS`
 * and `SIGNUP_FAILED` share the same message to prevent user enumeration
 * — the caller cannot tell which of the two it hit.
 */
const MESSAGES: Partial<Record<AuthErrorCode, string>> = {
	[AUTH_ERROR_CODES.USER_ALREADY_EXISTS]:
		'Unable to create account. Please try again or sign in.',
	[AUTH_ERROR_CODES.SIGNUP_FAILED]:
		'Unable to create account. Please try again or sign in.',
	[AUTH_ERROR_CODES.PASSWORD_COMPROMISED]:
		'This password has appeared in data breaches. Please choose a different one.',
	[AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED]:
		'Google sign in failed. Please try again.',
	[AUTH_ERROR_CODES.SOCIAL_PROVIDER_ERROR]:
		'Google sign in failed. Please try again.',
	[AUTH_ERROR_CODES.SOCIAL_CALLBACK_FAILED]:
		'Google sign in failed. Please try again.',
	[AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED]:
		'Google sign in failed. Please try again.',
	[COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED]:
		'Too many attempts. Please wait a moment.',
	[COMMON_ERROR_CODES.NETWORK_ERROR]:
		'Network error. Please check your connection.',
	[COMMON_ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
	[COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR]:
		'Server error. Please try again later.',
};

/**
 * Maps auth + common error codes to user-facing copy.
 *
 * @returns A human-readable message, falling back to a generic retry hint.
 */
export function getSignUpErrorMessage(errorCode: AuthErrorCode): string {
	return (
		MESSAGES[errorCode] ?? 'An unexpected error occurred. Please try again.'
	);
}
