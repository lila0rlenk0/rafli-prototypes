'use server';

import axios from 'axios';
import { redirect } from 'next/navigation';

import { env } from '@/env/server';
import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { getClientIp } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { captureServiceError } from '@/lib/sentry/capture';
import { clearSentryUser } from '@/lib/sentry/user';
import { runAfter } from '@/lib/utils/run-after';

import { clearAuthCookies } from './clear-auth';

/**
 * Signs out the current user.
 *
 * Clears FE auth state synchronously then defers the backend session
 * invalidation via `runAfter` so the redirect is not gated by a 20s
 * backend round-trip (the previous behaviour left the user waiting on
 * the sign-in page for several seconds after clicking sign out).
 *
 * Token, IP, and S2S secret are captured up front because the deferred
 * callback runs after the response: `authenticatedClient` would read
 * the (now-cleared) cookies and `getClientIp` / `headers()` is illegal
 * inside `after()`. Raw axios with pre-resolved values sidesteps both.
 *
 * @returns Never returns — always redirects to /sign-in
 */
export async function signOutUser(): Promise<never> {
	// Step 1: Snapshot auth state while cookies + request headers are still
	// readable. `getSession` is cache()-wrapped, `getClientIp` reads headers()
	// — both become unavailable once we clear cookies / leave request scope.
	// Parallel because the two reads are independent — avoids the sequential
	// await when `getSession` has to fetch /me (cache miss).
	const [session, clientIp] = await Promise.all([getSession(), getClientIp()]);
	const userId = session?.user?.id;
	const token = session?.token;

	// Step 2: Clear FE auth state immediately. Cookie removal is what the
	// proxy middleware checks on the next navigation, so the user appears
	// signed out the moment the redirect response reaches the browser.
	// Side-effects: deletes raffly-token, raffly-session, raffly-user-mode cookies.
	await clearAuthCookies();
	clearSentryUser();

	// Step 3: Non-blocking sign-out analytics — `trackAfter` resolves the IP
	// in request scope then defers the Mixpanel round-trip via runAfter.
	if (userId) {
		await trackAfter(AUTH_EVENTS.SIGN_OUT, {}, { userId });
	}

	// Step 4: Defer backend session invalidation until after the response
	// ships. Best-effort — the FE is already signed out; a failure here only
	// leaves a stale server session which backend-side expiry will reap.
	// Uses raw axios with the captured token because authenticatedClient's
	// request interceptor would look up the cookie we just deleted and the
	// baseClient interceptor calls headers(), illegal inside after().
	if (token) {
		runAfter(async () => {
			try {
				await axios.post(`${env.BACKEND_URL}/api/v1/auth/sign-out`, null, {
					timeout: API_TIMEOUTS.DEFAULT,
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
						'X-S2S-Secret': env.S2S_SECRET,
						// Trusted because backend validates X-S2S-Secret before reading X-Client-IP.
						...(clientIp && { 'X-Client-IP': clientIp }),
					},
				});
			} catch (error) {
				captureServiceError(error, 'auth:sign-out:failed', {
					service: 'auth',
					action: 'sign-out-user',
				});
			}
		});
	}

	// Step 5: Redirect — never returns.
	redirect('/sign-in');
}
