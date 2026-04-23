'use server';

import { AUTH_COOKIES } from '@/lib/auth/constants';
import { clearUserModeCookie } from '@/lib/mode/cookies';
import { cookies } from 'next/headers';

/**
 * Clears all authentication and user preference cookies.
 * Called on sign-out to ensure clean client state.
 *
 * Side-effects: deletes raffly-token, raffly-session, raffly-user-mode cookies.
 *
 * @returns Promise that resolves when all cookies are cleared
 */
export async function clearAuthCookies(): Promise<void> {
	// Step 1: Delete httpOnly auth token and client-readable session cookies
	const cookieStore = await cookies();
	cookieStore.delete(AUTH_COOKIES.TOKEN);
	cookieStore.delete(AUTH_COOKIES.SESSION);

	// Step 2: Delete user mode preference (participant/host toggle)
	await clearUserModeCookie();
}
