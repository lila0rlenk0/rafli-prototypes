'use server';

import { redirect } from 'next/navigation';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { captureServiceError } from '@/lib/sentry/capture';
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
	// Step 1: Capture session before clearing cookies — getSession() reads from cookies,
	// so we must snapshot the user ID before clearAuthCookies() deletes them.
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 2: Invalidate backend session (best-effort — cookie clearing below ensures clean FE state)
		await authenticatedClient.post('/auth/sign-out');
	} catch (error) {
		// Best-effort — backend session cleanup can fail without blocking sign-out.
		// Still report to Sentry so persistent backend failures are visible.
		captureServiceError(error, 'auth:sign-out:failed', {
			service: 'auth',
			action: 'sign-out-user',
		});
	} finally {
		// Step 3: Non-blocking sign-out analytics
		const userId = (await sessionPromise)?.user?.id;
		if (userId) {
			await trackAfter(AUTH_EVENTS.SIGN_OUT, {}, { userId });
		}

		// Step 4: Clear all auth cookies
		// Side-effects: deletes raffly-token, raffly-session, raffly-user-mode cookies
		await clearAuthCookies();

		// Step 5: Detach user from Sentry scope so post-logout errors aren't misattributed
		clearSentryUser();
	}

	// Step 6: Redirect — never returns
	redirect('/sign-in');
}
