'use server';

import { validateJwtStructure } from './jwt';

/**
 * Server action to set auth cookies from JWT token
 *
 * Called from client-side OAuth callback after exchanging session for JWT.
 * Backend must accept the token (GET /me) before cookies are set — see setAuthCookies.
 *
 * @param token - JWT token from backend
 * @returns Success/failure result
 */
export async function setAuthCookiesClient(
	token: string,
): Promise<{ success: boolean }> {
	try {
		// Structural validation before hitting the network — rejects malformed input early
		validateJwtStructure(token);
		// Dynamic import — a static `session` import would load `auth/session` (and
		// thus `fetch-me` bindings) before integration tests that override
		// `@/lib/auth/fetch-me-with-bearer` can run; OAuth callback still sees the
		// same setAuthCookies behavior at call time.
		const { setAuthCookies } = await import('@/lib/auth/session');
		await setAuthCookies(token);
		return { success: true };
	} catch (error) {
		console.error('Failed to set auth cookies:', error);
		return { success: false };
	}
}
