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

import { browserClient } from '@/lib/api/client-browser';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import type { AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

type SendMagicLinkResponse = ServiceResponse<void, AuthErrorCode>;

export async function sendMagicLink(
	email: string,
	callbackURL: string,
): Promise<SendMagicLinkResponse> {
	try {
		await browserClient.post('/auth/sign-in/magic-link', {
			email,
			callbackURL,
		});
		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'magic-link-send',
		});
		return failure(errorCode);
	}
}
