/**
 * JWT utility functions for client-side token handling
 *
 * IMPORTANT: These functions only DECODE tokens, they do NOT verify signatures.
 * Signature verification happens on the backend.
 */

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

		const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
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
