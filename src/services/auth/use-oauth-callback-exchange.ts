'use client';

import { useMutation } from '@tanstack/react-query';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { browserClient } from '@/lib/api/browser-client';
import { setAuthCookiesClient } from '@/lib/auth/client-session';
import { mapAuthError } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { validateReturnTo } from '@/lib/utils/routing/validate-return-to';

interface ExchangeRouter {
	push: (href: string) => void;
	refresh: () => void;
}

interface ExchangeArgs {
	searchParams: ReadonlyURLSearchParams;
	router: ExchangeRouter;
}

interface UseOAuthCallbackExchangeResult {
	mutate: (args: ExchangeArgs) => void;
	isError: boolean;
	errorMessage: string | null;
}

/**
 * React Query mutation that exchanges the OAuth backend session cookie for
 * a Raffly JWT, sets auth cookies, then redirects.
 *
 * Lives outside the route component so the route's `useEffect` body never
 * imports from `@/lib/api` directly — `local/no-useeffect-data-fetch`
 * (data-fetching.md) bans that pattern. Browser-only by design: the
 * better-auth session cookie is on the backend origin and only
 * `credentials: 'include'` from the browser carries it across origins.
 *
 * @returns Mutation trigger plus rendered error state
 */
export function useOAuthCallbackExchange(): UseOAuthCallbackExchangeResult {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: async ({ searchParams, router }: ExchangeArgs) => {
			const oauthError = searchParams.get('error');
			if (oauthError !== null) {
				track(AUTH_EVENTS.SIGN_IN_FAILED, {
					method: 'social',
					error_code: oauthError,
				});
				throw new OAuthExchangeError(
					'Google sign in was cancelled or failed. Please try again.',
				);
			}

			const response = await browserClient.get<{ token?: string }>(
				'/auth/token',
			);

			if (!response.data.token) {
				throw new OAuthExchangeError(
					'Failed to complete sign in. Please try signing in again.',
				);
			}

			const cookieResult = await setAuthCookiesClient(response.data.token);
			if (!cookieResult.success) {
				throw new OAuthExchangeError(
					'Failed to complete sign in. Please try signing in again.',
				);
			}

			// OAuth + magic-link both resolve here; method cannot be inferred
			// client-side, so attribute via the prior SIGN_IN_STARTED event.
			track(AUTH_EVENTS.SIGN_IN_COMPLETED, { method: 'callback' });

			const returnTo = validateReturnTo(searchParams.get('returnTo'));
			router.push(returnTo);
			router.refresh();
		},
		onError: error => {
			if (error instanceof OAuthExchangeError) {
				setErrorMessage(error.message);
				return;
			}
			const errorCode = mapAuthError(error);
			captureServiceError(error, errorCode, {
				service: 'auth',
				action: 'oauth-callback-token-exchange',
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

class OAuthExchangeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OAuthExchangeError';
	}
}
