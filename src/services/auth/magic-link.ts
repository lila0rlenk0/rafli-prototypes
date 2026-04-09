'use client';

/**
 * Client-side Magic Link Sign-In Service
 *
 * MUST run client-side because:
 * - Needs `window.location.origin` for the callbackURL
 * - Better-Auth catch-all endpoint validates trusted origins from browser
 *
 * Flow:
 * 1. POST /auth/sign-in/magic-link with { email, callbackURL }
 * 2. User receives email with magic link → clicks it → backend verifies
 * 3. Backend sets session cookie → redirects to callbackURL (/auth/callback)
 * 4. Existing OAuth callback handler exchanges session cookie for JWT
 */

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { browserClient } from '@/lib/api/client-browser';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import type { AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

type SendMagicLinkResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Sends a magic link email for passwordless sign-in.
 *
 * @param email - User's email address
 * @param callbackURL - URL to redirect to after email verification
 * @returns ServiceResponse with void on success, AuthErrorCode on failure
 */
export async function sendMagicLink(
	email: string,
	callbackURL: string,
): Promise<SendMagicLinkResponse> {
	try {
		// Step 1: Fire-and-forget intent tracking — captures drop-off before email delivery
		track(AUTH_EVENTS.SIGN_IN_STARTED, { method: 'magic_link' });

		// Step 2: Request magic link email from backend (browser client, not server action)
		await browserClient.post('/auth/sign-in/magic-link', {
			email,
			callbackURL,
		});

		return success(undefined);
	} catch (error) {
		// Step 3: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'magic-link-send',
		});
		return failure(errorCode);
	}
}
