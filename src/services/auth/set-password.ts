'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { setPasswordInputSchema, type SetPasswordInput } from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Sets a password for a user who never had one — social-login or magic-link
 * signups whose credential account has a null password.
 *
 * Endpoint: `POST /auth/set-password` (auth required). Distinct from
 * `change-password` because there's no current password to verify; the BE
 * rejects with `auth:password:already-set` if the credential row already
 * carries a non-null password (the UI should switch to change-password in
 * that case — the user's `hasPassword` flag must be stale).
 *
 * @param input - `{ newPassword }` — 12-char minimum enforced both
 *   FE-side (zodResolver in the form) and BE-side.
 * @returns ServiceResponse with void on success, AuthErrorCode on failure.
 */
export async function setPassword(
	input: SetPasswordInput,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	try {
		// Step 1: Re-parse input — server actions are public POST endpoints,
		// attackers can append extra fields (e.g. `userId`, `role`) that could
		// be honoured by a lax backend. Zod strips unknowns and enforces the
		// 12-char policy before the request leaves the BFF.
		const validated = setPasswordInputSchema.safeParse(input);
		if (!validated.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Forward to BE — set-password is auth-gated; the BE pulls the
		// user id from the JWT, so the body only carries the password.
		await authenticatedClient.post('/auth/set-password', validated.data);

		return success(undefined);
	} catch (error) {
		// Step 3: Map and capture — auth is a critical service. Expected
		// codes (`already-set`, `compromised`) are sampled per the Sentry
		// filter; transport errors (network/5xx) page on-call.
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'set-password',
		});
		return failure(errorCode);
	}
}
