'use server';

import { redirect } from 'next/navigation';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';

import { clearAuthCookies } from './clear-auth';

/**
 * Signs out the current user
 *
 * Clears backend session, removes auth cookies, tracks the event,
 * and redirects to sign-in page.
 *
 * @returns Never returns - always redirects to /sign-in
 */
export async function signOutUser(): Promise<never> {
	const session = await getSession();

	// Track sign out BEFORE clearing cookies (redirect() throws, so tracking after would never execute)
	if (session?.user) {
		await trackServer(AUTH_EVENTS.SIGN_OUT, {}, { userId: session.user.id });
	}

	try {
		await authenticatedClient.post('/api/auth/sign-out');
	} catch (error) {
		console.error('Sign out error:', error);
	} finally {
		await clearAuthCookies();
	}

	redirect('/sign-in');
}
