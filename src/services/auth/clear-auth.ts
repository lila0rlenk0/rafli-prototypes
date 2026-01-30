'use server';

import { AUTH_COOKIES } from '@/lib/auth/config';
import { clearUserModeCookie } from '@/lib/mode/cookies';
import { cookies } from 'next/headers';

/**
 * Clears all authentication and user preference cookies
 * Should be called on sign out to ensure clean state
 */
export async function clearAuthCookies() {
	const cookieStore = await cookies();
	cookieStore.delete(AUTH_COOKIES.TOKEN);
	cookieStore.delete(AUTH_COOKIES.SESSION);
	await clearUserModeCookie();
}
