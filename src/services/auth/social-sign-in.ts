'use client';

/**
 * Client-side Social Sign-In Service
 *
 * Handles OAuth flow initiation. MUST run client-side because
 * better-auth sets state cookies that need to be in the browser.
 *
 * @see src/app/(auth)/auth/callback/callback-handler.tsx for callback handling
 */

import { ZodError } from 'zod';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { browserClient } from '@/lib/api/client-browser';
import { failure, mapAuthError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import {
	socialSignInInputSchema,
	socialSignInResponseSchema,
	type SocialSignInInput,
	type SocialSignInResponse,
} from '@/types/auth';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

type SocialSignInServiceResponse = ServiceResponse<
	SocialSignInResponse,
	AuthErrorCode
>;

/**
 * Initiates social sign-in OAuth flow
 *
 * Validates input and response using Zod schemas.
 * Returns the OAuth redirect URL on success.
 *
 * @param input - Social sign-in input (provider, callbackURL)
 * @returns ServiceResponse with redirect URL or error code
 *
 * @example
 * const result = await initiateSocialSignIn({ provider: 'google', callbackURL: '/auth/callback' });
 * if (result.success) {
 *   window.location.href = result.data.url;
 * }
 */
export async function initiateSocialSignIn(
	input: SocialSignInInput,
): Promise<SocialSignInServiceResponse> {
	// safeParse for input — server actions are public endpoints
	const validation = socialSignInInputSchema.safeParse(input);
	if (!validation.success) {
		return failure(AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED);
	}

	try {
		// Track intent — captures OAuth flow drop-off (user may cancel on provider screen)
		track(AUTH_EVENTS.SIGN_IN_STARTED, {
			method: 'social',
			provider: validation.data.provider,
		});

		const response = await browserClient.post<unknown>(
			'/auth/sign-in/social',
			validation.data,
		);

		// .parse() for response — throws ZodError into catch for contract drift detection
		return success(socialSignInResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'auth', 'social-sign-in');
			return failure(AUTH_ERROR_CODES.SOCIAL_PROVIDER_ERROR);
		}

		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'social-sign-in',
		});
		return failure(errorCode);
	}
}
