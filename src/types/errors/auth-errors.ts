import type { CommonErrorCode } from './common-errors';

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

	// Password reset errors
	/** Password reset request or completion failed */
	PASSWORD_RESET_FAILED: 'auth:password-reset:failed',

	// Password security errors
	/** Password found in data breach (Have I Been Pwned) */
	PASSWORD_COMPROMISED: 'auth:password:compromised',
	/** OAuth-only account has no password set */
	PASSWORD_NOT_SET: 'auth:password:not-set',
	/** Current password is incorrect (change-password flow) */
	PASSWORD_INVALID: 'auth:password:invalid',
} as const;

export type AuthErrorCode =
	| (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]
	| CommonErrorCode;
