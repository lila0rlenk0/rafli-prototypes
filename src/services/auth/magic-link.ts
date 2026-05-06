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
import { browserClient } from '@/lib/api/browser-client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { magicLinkInputSchema, type MagicLinkInput } from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

type SendMagicLinkResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Sends a magic link email for passwordless sign-in.
 *
 * @param input - Email, post-verification callback URL, and Turnstile captcha token
 * @returns ServiceResponse with void on success, AuthErrorCode on failure
 */
export async function sendMagicLink(
	input: MagicLinkInput,
): Promise<SendMagicLinkResponse> {
	try {
		// Step 1: Validate — browser-side action exposed to a public form, so the
		// schema is the trust boundary. min(1) on captchaToken catches the "user
		// submitted before widget issued a token" race before a network call.
		const validated = magicLinkInputSchema.safeParse(input);
		if (!validated.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Fire-and-forget intent tracking — captures drop-off before email delivery
		track(AUTH_EVENTS.SIGN_IN_STARTED, { method: 'magic_link' });

		// Step 3: Request magic link email from backend.
		// Captcha token travels in the `x-captcha-response` header — Better Auth's
		// captcha plugin reads it from the header (not body) before any auth
		// handler runs, so it must be stripped from the JSON payload.
		const { captchaToken, ...payload } = validated.data;
		await browserClient.post('/auth/sign-in/magic-link', payload, {
			headers: { 'x-captcha-response': captchaToken },
		});

		return success(undefined);
	} catch (error) {
		// Step 4: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'magic-link-send',
		});
		return failure(errorCode);
	}
}
