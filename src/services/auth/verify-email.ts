'use server';

import { z, ZodError } from 'zod';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/** Zod schema for verify-email response — schema-first, infer type */
const verifyEmailResponseSchema = z.object({
	message: z.string(),
	success: z.boolean(),
	token: z.string().optional(),
	user: z
		.object({
			email: z.string(),
			emailVerified: z.boolean(),
			id: z.string(),
			name: z.string(),
		})
		.optional(),
});

type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;

type VerifyEmailServiceResponse = ServiceResponse<
	VerifyEmailResponse,
	AuthErrorCode
>;

/**
 * Calls the backend verify-email endpoint with the token from the email link.
 * Returns the JWT token on success (auto-sign-in enabled on backend).
 *
 * @param token - Verification token from the email link
 * @returns ServiceResponse with verification data or error code
 */
/** Token shape check — backend verifies signature/expiry; BFF rejects empty. */
const verifyEmailTokenSchema = z.string().min(1);

export async function verifyEmail(
	token: string,
): Promise<VerifyEmailServiceResponse> {
	// Step 1: Short-circuit empty tokens — backend would reject anyway and
	// burning a network round-trip creates a timing side-channel between
	// "empty" and "malformed" that we prefer to collapse here.
	const validated = verifyEmailTokenSchema.safeParse(token);
	if (!validated.success) {
		return failure(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
	}

	try {
		const response = await baseClient.get('/auth/verify-email', {
			params: { token: validated.data },
		});

		// .parse() for response — throws ZodError into catch for contract drift detection
		const data = verifyEmailResponseSchema.parse(response.data);

		// Backend returns success: false for invalid/expired tokens
		if (!data.success) {
			return failure(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
		}

		// Deferred analytics — runs post-response so it never blocks the redirect
		if (data.user?.id) {
			await trackAfter(
				ACCOUNT_EVENTS.EMAIL_VERIFIED,
				{ user_email: data.user.email },
				{ userId: data.user.id },
			);
		}

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'auth', 'verify-email');
			return failure(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
		}

		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'verify-email',
		});
		return failure(errorCode);
	}
}
