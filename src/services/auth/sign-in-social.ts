'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors';
import type { SocialProvider, SocialSignInResponse } from '@/types/auth';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

type SignInSocialResponse = ServiceResponse<
	SocialSignInResponse,
	AuthErrorCode
>;

/**
 * Initiates social sign-in flow by requesting OAuth redirect URL
 *
 * @param provider - The social provider to use (e.g., 'google')
 * @param callbackURL - URL to redirect to after OAuth completes
 * @returns ServiceResponse with OAuth URL on success
 */
export async function signInSocial(
	provider: SocialProvider,
	callbackURL: string,
): Promise<SignInSocialResponse> {
	try {
		const response = await baseClient.post('/api/auth/sign-in/social', {
			provider,
			callbackURL,
		});

		if (!response.data.url) {
			return failure(AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED);
		}

		return success({
			redirect: response.data.redirect ?? true,
			url: response.data.url,
		});
	} catch (error) {
		const errorCode = mapAuthError(error);
		return failure(errorCode);
	}
}
