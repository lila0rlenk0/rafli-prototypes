'use server';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import {
	requestPasswordResetInputSchema,
	type RequestPasswordResetInput,
} from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
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
		// Step 2: Request password reset email from backend
		await baseClient.post('/auth/forget-password', validated.data);

		// Step 3: Fire-and-forget analytics — no userId available (unauthenticated flow)
		void trackServer(ACCOUNT_EVENTS.PASSWORD_RESET_REQUESTED, {});

		return success(undefined);
	} catch (error) {
		// Step 4: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'request-password-reset',
		});

		// Step 5: Only surface infrastructure errors — 4XX errors return success
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
