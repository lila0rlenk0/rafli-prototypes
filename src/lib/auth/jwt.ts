/**
 * JWT utility functions for token handling
 *
 * IMPORTANT: These functions only DECODE tokens, they do NOT verify signatures.
 * Signature verification happens on the backend.
 *
 * These utilities are compatible with both Node.js and Edge Runtime (middleware).
 */

import { z } from 'zod';

import type { AuthUser } from '@/types/auth';

/**
 * JWT Payload schema for validation
 * Requires at least one of sub or id to be present
 */
const jwtPayloadSchema = z
	.object({
		sub: z.string().optional(),
		id: z.string().optional(),
		email: z.string(),
		emailVerified: z.boolean(),
		name: z.string(),
		permissions: z.array(z.string()).optional(),
		exp: z.number(),
		iat: z.number(),
	})
	.refine(data => data.sub || data.id, {
		message: 'JWT must contain either sub or id claim',
	});

/**
 * JWT Payload structure from backend
 */
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

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
		const parsed: unknown = JSON.parse(payloadJson);
		return jwtPayloadSchema.parse(parsed);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`Failed to decode JWT: ${message}`);
	}
}

/**
 * Clock-skew tolerance in seconds.
 * Prevents premature expiry when device clock is slightly ahead of server.
 * 60s is negligible for a 30-day token but covers typical NTP drift.
 */
const CLOCK_SKEW_TOLERANCE_SECONDS = 60;

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
		// Subtract tolerance so tokens are considered valid for 60s past server-side exp
		return payload.exp < nowInSeconds - CLOCK_SKEW_TOLERANCE_SECONDS;
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
	// Schema refinement guarantees at least one exists
	const userId = payload.sub ?? payload.id;
	if (!userId) {
		throw new Error('JWT payload missing user id');
	}

	return {
		id: userId,
		email: payload.email,
		emailVerified: payload.emailVerified,
		name: payload.name,
		image: null,
		permissions: payload.permissions,
	};
}
