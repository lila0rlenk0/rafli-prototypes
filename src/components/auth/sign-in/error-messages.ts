import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';

/** Lookup keeps cyclomatic complexity low — the switch grew past the lint cap. */
const SIGN_IN_ERROR_MESSAGE_BY_CODE: Partial<Record<AuthErrorCode, string>> = {
	[AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password.',
	[AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired.',
	[AUTH_ERROR_CODES.INVALID_TOKEN]:
		'Invalid or expired link. Please try again.',
	[AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED]:
		'Google sign in failed. Please try again.',
	[AUTH_ERROR_CODES.SOCIAL_PROVIDER_ERROR]:
		'Google sign in failed. Please try again.',
	[AUTH_ERROR_CODES.SOCIAL_CALLBACK_FAILED]:
		'Google sign in failed. Please try again.',
	[AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED]:
		'Google sign in failed. Please try again.',
	[COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED]: 'Authentication failed.',
	[COMMON_ERROR_CODES.UNAUTHORIZED]: 'Authentication failed.',
	[COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED]:
		'Too many attempts. Please wait a moment.',
	[COMMON_ERROR_CODES.NETWORK_ERROR]:
		'Network error. Please check your connection.',
	[COMMON_ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out.',
	[COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Server error.',
};

/**
 * Maps auth and infrastructure error codes to user-friendly messages.
 * Covers credential errors, social login failures, and common infrastructure issues.
 */
export function getSignInErrorMessage(errorCode: AuthErrorCode): string {
	return (
		SIGN_IN_ERROR_MESSAGE_BY_CODE[errorCode] ?? 'An unexpected error occurred.'
	);
}
