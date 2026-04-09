'use server';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import type { AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

interface VerifyEmailResponse {
	message: string;
	success: boolean;
	token?: string;
	user?: {
		email: string;
		emailVerified: boolean;
		id: string;
		name: string;
	};
}

type VerifyEmailServiceResponse = ServiceResponse<
	VerifyEmailResponse,
	AuthErrorCode
>;

/**
 * Calls the backend verify-email endpoint with the token from the email link.
 * Returns the JWT token on success (auto-sign-in enabled on backend).
 */
export async function verifyEmail(
	token: string,
): Promise<VerifyEmailServiceResponse> {
	try {
		const response = await baseClient.get<VerifyEmailResponse>(
			'/auth/verify-email',
			{ params: { token } },
		);

		if (!response.data.success) {
			return failure(mapAuthError(new Error('Verification failed')));
		}

		// Fire-and-forget — verification is complete, tracking must not block redirect
		if (response.data.user?.id) {
			void trackServer(
				ACCOUNT_EVENTS.EMAIL_VERIFIED,
				{
					user_email: response.data.user.email,
				},
				{ userId: response.data.user.id },
			);
		}

		return success(response.data);
	} catch (error) {
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'verify-email',
		});
		return failure(errorCode);
	}
}
