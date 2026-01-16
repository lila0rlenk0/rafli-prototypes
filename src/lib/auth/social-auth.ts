'use client';

/**
 * Client-side Social Authentication Utilities
 *
 * Handles OAuth flow initiation with validation.
 * MUST be client-side because better-auth sets cookies in the browser.
 *
 * @see src/app/(auth)/auth/callback/callback-handler.tsx for callback handling
 */

import { browserClient } from '@/lib/api/client-browser';
import {
	socialProviderSchema,
	socialSignInInputSchema,
	socialSignInResponseSchema,
	type SocialProvider,
	type SocialSignInResponse,
} from '@/types/auth';

/**
 * Result type for social sign-in initiation
 */
export type InitiateSocialSignInResult =
	| { success: true; data: SocialSignInResponse }
	| { success: false; error: string };

/**
 * Initiates social sign-in OAuth flow
 *
 * Validates input and response using Zod schemas.
 * Returns the OAuth redirect URL on success.
 *
 * IMPORTANT: This MUST run client-side because:
 * - better-auth sets state cookies that need to be in the browser
 * - Server actions run on Next.js server, not in browser context
 *
 * @param provider - Social provider (currently only 'google')
 * @param callbackURL - URL to redirect back to after OAuth
 * @returns Result with redirect URL on success, error message on failure
 *
 * @example
 * const result = await initiateSocialSignIn('google', '/auth/callback');
 * if (result.success) {
 *   window.location.href = result.data.url;
 * }
 */
export async function initiateSocialSignIn(
	provider: SocialProvider,
	callbackURL?: string,
): Promise<InitiateSocialSignInResult> {
	// Validate provider
	const providerValidation = socialProviderSchema.safeParse(provider);
	if (!providerValidation.success) {
		return { success: false, error: 'Invalid social provider' };
	}

	// Validate full input
	const inputValidation = socialSignInInputSchema.safeParse({
		provider: providerValidation.data,
		callbackURL,
	});

	if (!inputValidation.success) {
		return { success: false, error: 'Invalid callback URL' };
	}

	try {
		// Make request to backend
		const response = await browserClient.post<unknown>(
			'/api/auth/sign-in/social',
			inputValidation.data,
		);

		// Validate response
		const responseValidation = socialSignInResponseSchema.safeParse(
			response.data,
		);

		if (!responseValidation.success) {
			return { success: false, error: 'Invalid response from server' };
		}

		return { success: true, data: responseValidation.data };
	} catch {
		return { success: false, error: 'Failed to initiate sign in' };
	}
}
