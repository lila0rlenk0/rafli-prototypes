/**
 * JWT utility functions for token handling
 *
 * IMPORTANT: These functions only DECODE tokens, they do NOT verify signatures.
 * Signature verification happens on the backend.
 *
 * These utilities are compatible with both Node.js and Edge Runtime (middleware).
 */

import type { AuthUser } from '@/types/auth';

/**
 * JWT Payload structure from backend
 */
export interface JwtPayload {
	sub: string; // User ID
	id: string; // User ID (alternative)
	email: string;
	emailVerified: boolean;
	name: string;
	permissions?: string[];
	exp: number; // Expiration timestamp (seconds)
	iat: number; // Issued at timestamp (seconds)
}

/**
 * Base64 URL decode - works in both Node.js and Edge Runtime
 *
 * @param str - Base64 URL encoded string
 * @returns Decoded string
 */
function base64UrlDecode(str: string): string {
	// Replace URL-safe characters
	let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

	// Add padding if needed
	const pad = base64.length % 4;
	if (pad) {
		if (pad === 1) {
			throw new Error('Invalid base64 string');
		}
		base64 += new Array(5 - pad).join('=');
	}

	// Decode using native atob (works in both environments)
	try {
		return decodeURIComponent(
			atob(base64)
				.split('')
				.map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join(''),
		);
	} catch {
		throw new Error('Failed to decode base64');
	}
}

/**
 * Decode JWT payload to extract user data
 *
 * @param token - JWT token string
 * @returns Decoded JWT payload with user data
 * @throws Error if token is malformed
 */
export function decodeJwt(token: string): JwtPayload {
	try {
		const [, payloadBase64] = token.split('.');

		if (!payloadBase64) {
			throw new Error('Invalid JWT format');
		}

		const payloadJson = base64UrlDecode(payloadBase64);
		return JSON.parse(payloadJson) as JwtPayload;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`Failed to decode JWT: ${message}`);
	}
}

/**
 * Check if JWT token is expired
 *
 * @param token - JWT token string
 * @returns true if expired, false otherwise
 */
export function isJwtExpired(token: string): boolean {
	try {
		const payload = decodeJwt(token);
		const nowInSeconds = Math.floor(Date.now() / 1000);
		return payload.exp < nowInSeconds;
	} catch {
		return true;
	}
}

/**
 * Convert JWT payload to AuthUser object
 *
 * Extracts user data from decoded JWT claims.
 * Used by session management to create consistent user objects.
 *
 * @param payload - Decoded JWT payload
 * @returns AuthUser object for session/cookie storage
 */
export function jwtPayloadToUser(payload: JwtPayload): AuthUser {
	return {
		id: payload.sub || payload.id,
		email: payload.email,
		emailVerified: payload.emailVerified,
		name: payload.name,
		image: null,
		permissions: payload.permissions,
	};
}
