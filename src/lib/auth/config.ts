/**
 * Centralized authentication configuration
 *
 * All auth-related constants and cookie configurations
 */

// Cookie names
export const AUTH_COOKIES = {
	TOKEN: 'raffly-token',
	SESSION: 'raffly-session',
} as const;

// Cookie options
export const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 7, // 7 days
	path: '/',
} as const;
