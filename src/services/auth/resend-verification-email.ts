'use server';

import { z } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Wire payload for the resend-verification server action. The captcha
 * token is required because the backend (M3 from the 2026-05 white-hat
 * audit) gates `/auth/send-verification-email` behind Turnstile to close
 * the mailbomb surface — calling without a token is now a hard 400 from
 * Encore's Rust parser before any handler runs.
 */
export interface ResendVerificationInput {
	readonly captchaToken: string;
	readonly email: string;
}

const resendVerificationInputSchema = z.object({
	captchaToken: z.string().min(1),
	email: z.email(),
});

/**
 * Requests a new verification email for the given address.
 * Backend always returns 200 regardless of account existence (enumeration-safe).
 *
 * Only infrastructure errors (network, timeout, rate limit) and captcha
 * failures surface as failures so the user knows to retry — all other
 * errors silently succeed to prevent leaking whether an account exists.
 *
 * Captcha errors are surfaced (not swallowed) because they fire BEFORE the
 * account lookup: surfacing them leaks nothing about account existence and
 * is mandatory — without an actionable message the user is stuck on a
 * silent-failing form after the token expires.
 *
 * @param input - Email address + Cloudflare Turnstile token
 * @returns ServiceResponse with void on success, AuthErrorCode for infra / captcha errors
 */
export async function resendVerificationEmail(
	input: ResendVerificationInput,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	// Step 1: Re-parse input — server actions are public POST endpoints; a
	// caller can pass arbitrary strings (null-like, very long, injection).
	// Malformed input silently succeeds (enumeration-safe contract) but does
	// NOT burn a backend round-trip.
	const validated = resendVerificationInputSchema.safeParse(input);
	if (!validated.success) {
		return success(undefined);
	}

	try {
		// Step 2: Request verification email — backend returns 200 regardless of
		// account existence. Captcha token travels in the `x-captcha-response`
		// header so the verifier reads it before the body schema is parsed.
		const { captchaToken, ...payload } = validated.data;
		await baseClient.post('/auth/send-verification-email', payload, {
			headers: { 'x-captcha-response': captchaToken },
		});

		return success(undefined);
	} catch (error) {
		// Step 3: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'resend-verification-email',
		});

		// Step 4: Surface infrastructure + captcha errors. Captcha failures
		// are never enumeration leaks — they fire before the user lookup —
		// so we surface them so the form can prompt a retry instead of
		// silently spinning. 4XX account-existence errors stay swallowed.
		if (
			errorCode === COMMON_ERROR_CODES.NETWORK_ERROR ||
			errorCode === COMMON_ERROR_CODES.TIMEOUT_ERROR ||
			errorCode === COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR ||
			errorCode === COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED ||
			errorCode === AUTH_ERROR_CODES.CAPTCHA_INVALID ||
			errorCode === AUTH_ERROR_CODES.CAPTCHA_MISSING ||
			errorCode === AUTH_ERROR_CODES.CAPTCHA_UNAVAILABLE
		) {
			return failure(errorCode);
		}

		return success(undefined);
	}
}
