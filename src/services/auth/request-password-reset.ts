'use server';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import {
	requestPasswordResetInputSchema,
	type RequestPasswordResetInput,
} from '@/types/auth';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Requests a password reset email.
 * Always returns success to prevent user enumeration attacks — only infrastructure
 * errors (network, timeout, 5XX) surface as failures so the user knows to retry.
 *
 * @param input - Email and optional redirect URL
 * @returns ServiceResponse with void on success
 */
export async function requestPasswordReset(
	input: RequestPasswordResetInput,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	// Step 1: Re-parse input — server actions are public POST endpoints,
	// attackers can append arbitrary fields (e.g. future admin flags) or
	// malformed values. Zod strips unknowns and rejects invalid emails
	// before any outbound call. Malformed input returns success to preserve
	// the enumeration-safe contract but does NOT burn a backend request.
	const validated = requestPasswordResetInputSchema.safeParse(input);
	if (!validated.success) {
		return success(undefined);
	}

	try {
		// Step 2: Request password reset email from backend.
		// Captcha token travels in the `x-captcha-response` header — Better Auth's
		// captcha plugin reads it from the header (not body) before any auth
		// handler runs, so it must be stripped from the JSON payload.
		const { captchaToken, ...payload } = validated.data;
		await baseClient.post('/auth/forget-password', payload, {
			headers: { 'x-captcha-response': captchaToken },
		});

		// Step 3: Deferred analytics — no userId available (unauthenticated flow)
		await trackAfter(ACCOUNT_EVENTS.PASSWORD_RESET_REQUESTED, {});

		return success(undefined);
	} catch (error) {
		// Step 4: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'request-password-reset',
		});

		// Step 5: Surface infrastructure errors and captcha failures.
		// - 4XX account-existence errors are swallowed to prevent enumeration
		//   (attacker can't tell if the email is registered).
		// - Captcha errors fire BEFORE any account lookup — surfacing them
		//   leaks nothing and is mandatory: without an actionable message the
		//   user is stuck on a silent-failing form after the token expires.
		if (
			errorCode === COMMON_ERROR_CODES.NETWORK_ERROR ||
			errorCode === COMMON_ERROR_CODES.TIMEOUT_ERROR ||
			errorCode === COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR ||
			errorCode === COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED ||
			errorCode === AUTH_ERROR_CODES.CAPTCHA_FAILED ||
			errorCode === AUTH_ERROR_CODES.CAPTCHA_MISSING
		) {
			return failure(errorCode);
		}

		return success(undefined);
	}
}
