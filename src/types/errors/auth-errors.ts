import type { CommonErrorCode } from './common-errors';

/**
 * Authentication Error Codes
 *
 * Authentication-specific error codes that match backend error codes
 * from auth endpoints (sign-in, sign-up, sign-out).
 *
 * These codes are extracted directly from backend responses using the
 * RFC 7807 URN format or simple code format.
 */

/**
 * Authentication error codes constant object
 * Contains only essential auth error codes used in the application
 */
export const AUTH_ERROR_CODES = {
	// Auth user errors
	/** Invalid email or password during sign-in */
	INVALID_CREDENTIALS: 'auth:user:invalid-credentials',
	/** Email already exists during sign-up */
	USER_ALREADY_EXISTS: 'auth:user:already-exists',

	// Sign up errors
	/** Generic sign-up failure */
	SIGNUP_FAILED: 'auth:signup:failed',

	// Token/Session errors
	/** Invalid authentication token */
	INVALID_TOKEN: 'auth:token:invalid',
	/** Authentication token has expired */
	TOKEN_EXPIRED: 'auth:token:expired',

	// Social login errors
	/** Generic social login failure */
	SOCIAL_LOGIN_FAILED: 'auth:social:failed',
	/** Error from social provider */
	SOCIAL_PROVIDER_ERROR: 'auth:social:provider-error',
	/** OAuth callback failed */
	SOCIAL_CALLBACK_FAILED: 'auth:social:callback-failed',
	/** Failed to exchange social token for JWT */
	SOCIAL_TOKEN_EXCHANGE_FAILED: 'auth:social:token-exchange-failed',
} as const;

/**
 * Authentication error code type
 * Represents all possible auth-specific and common error codes
 */
export type AuthErrorCode =
	| (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]
	| CommonErrorCode;
