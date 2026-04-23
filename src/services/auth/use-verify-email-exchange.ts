'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { setAuthCookiesClient } from '@/lib/auth/client-session';
import { mapAuthError } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { verifyEmail } from '@/services/auth/verify-email';

interface VerifyEmailRouter {
	push: (href: string) => void;
	refresh: () => void;
}

interface VerifyEmailArgs {
	token: string;
	router: VerifyEmailRouter;
}

interface UseVerifyEmailExchangeResult {
	mutate: (args: VerifyEmailArgs) => void;
	isError: boolean;
	errorMessage: string | null;
}

/**
 * React Query mutation that verifies an email-confirmation token, sets
 * auth cookies when the backend returns a JWT, and redirects.
 *
 * Lives outside the route component so the route's `useEffect` body never
 * imports from `@/services/*` directly — `local/no-useeffect-data-fetch`
 * (data-fetching.md) bans that pattern.
 *
 * @returns Mutation trigger plus rendered error state
 */
export function useVerifyEmailExchange(): UseVerifyEmailExchangeResult {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: async ({ token, router }: VerifyEmailArgs) => {
			const result = await verifyEmail(token);

			if (!result.success) {
				throw new VerifyEmailError(
					'This verification link is invalid or has expired. Please request a new one.',
				);
			}

			if (result.data.token) {
				const cookieResult = await setAuthCookiesClient(result.data.token);
				if (!cookieResult.success) {
					router.push('/sign-in');
					return;
				}

				router.push('/browse');
				router.refresh();
				return;
			}

			router.push('/sign-in');
		},
		onError: error => {
			if (error instanceof VerifyEmailError) {
				setErrorMessage(error.message);
				return;
			}
			const errorCode = mapAuthError(error);
			captureServiceError(error, errorCode, {
				service: 'auth',
				action: 'verify-email-handler',
			});
			setErrorMessage('An unexpected error occurred. Please try again.');
		},
	});

	return {
		mutate: mutation.mutate,
		isError: errorMessage !== null,
		errorMessage,
	};
}

class VerifyEmailError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'VerifyEmailError';
	}
}
