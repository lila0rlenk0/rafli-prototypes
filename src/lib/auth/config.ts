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
	secure: clientEnv.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 7, // 7 days
	path: '/',
} as const;

// Mode cookie options (httpOnly: client syncs via server action, never reads)
export const MODE_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: clientEnv.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 365, // 1 year (preference)
	path: '/',
} as const;
