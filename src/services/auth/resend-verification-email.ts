'use server';

import { z } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/** RFC 5322-ish shape check — backend is authoritative, this filters obvious junk. */
const emailSchema = z.email();

/**
 * Requests a new verification email for the given address.
 * Backend always returns 200 regardless of account existence (enumeration-safe).
 *
 * Only infrastructure errors (network, timeout, rate limit) surface as failures
 * so the user knows to retry — all other errors silently succeed to prevent
 * leaking whether an account exists.
 *
 * @param email - Email address to send verification to
 * @returns ServiceResponse with void on success, AuthErrorCode only for infra errors
 */
export async function resendVerificationEmail(
	email: string,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	// Step 1: Re-parse input — server actions are public POST endpoints; a
	// caller can pass arbitrary strings (null-like, very long, injection).
	// Malformed input silently succeeds (enumeration-safe contract) but does
	// NOT burn a backend round-trip.
	const validated = emailSchema.safeParse(email);
	if (!validated.success) {
		return success(undefined);
	}

	try {
		// Step 2: Request verification email — backend returns 200 regardless of account existence
		await baseClient.post('/auth/send-verification-email', {
			email: validated.data,
		});

		return success(undefined);
	} catch (error) {
		// Step 3: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'resend-verification-email',
		});

		// Step 4: Only surface infrastructure errors — 4XX errors return success
		// to prevent user enumeration (attacker can't tell if email exists)
		if (
			errorCode === COMMON_ERROR_CODES.NETWORK_ERROR ||
			errorCode === COMMON_ERROR_CODES.TIMEOUT_ERROR ||
			errorCode === COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR ||
			errorCode === COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED
		) {
			return failure(errorCode);
		}

		return success(undefined);
	}
}
