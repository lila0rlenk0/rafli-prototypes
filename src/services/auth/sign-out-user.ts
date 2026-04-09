'use server';

import { runAfter } from '@/lib/run-after';
import { redirect } from 'next/navigation';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { clearSentryUser } from '@/lib/sentry/user';

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
	// Capture session before clearing cookies — getSession() reads from cookies,
	// so we must start the read before clearAuthCookies() runs in the finally block.
	const sessionPromise = getSession();

	try {
		await authenticatedClient.post('/auth/sign-out');
	} catch {
		// Backend session cleanup is best-effort — cookie clearing below ensures clean FE state
	} finally {
		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;
			if (!userId) return;

			await trackServer(AUTH_EVENTS.SIGN_OUT, {}, { userId });
		});

		await clearAuthCookies();
		// Detach user from Sentry scope so post-logout errors aren't misattributed
		clearSentryUser();
	}

	redirect('/sign-in');
}
