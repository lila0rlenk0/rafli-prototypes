/**
 * Centralized authentication configuration
 *
 * All auth-related constants and cookie configurations
 */

import { clientEnv } from '@/env/client';

// Cookie names
export const AUTH_COOKIES = {
	TOKEN: 'raffly-token',
	SESSION: 'raffly-session',
	USER_MODE: 'raffly-user-mode',
} as const;

// Cookie options
export const COOKIE_OPTIONS = {
	httpOnly: true,
	// Secure flag for all non-development environments — staging, preview, and production
	// all transmit cookies over HTTPS. Only local dev (http://localhost) skips TLS.
	secure: clientEnv.NEXT_PUBLIC_APP_ENV !== 'development',
	sameSite: 'lax' as const,
	// Aligned with BE JWT expirationTime (30d in better-auth.config.ts:279).
	// Previously 7d — browser deleted cookie 23 days before JWT expired,
	// silently logging users out with no recovery path.
	// 30 days
	maxAge: 60 * 60 * 24 * 30,
	path: '/',
} as const;

// Mode cookie options (httpOnly: client syncs via server action, never reads)
export const MODE_COOKIE_OPTIONS = {
	httpOnly: true,
	// Secure flag for all non-development environments — staging, preview, and production
	// all transmit cookies over HTTPS. Only local dev (http://localhost) skips TLS.
	secure: clientEnv.NEXT_PUBLIC_APP_ENV !== 'development',
	sameSite: 'lax' as const,
	// 1 year (user preference, low security risk)
	maxAge: 60 * 60 * 24 * 365,
	path: '/',
} as const;
