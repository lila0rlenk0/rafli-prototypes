'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { setAuthCookiesClient } from '@/lib/auth/session-client';
import { browserClient } from '@/lib/api/client-browser';
import { AUTH_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { mapAuthError } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { validateReturnTo } from '@/lib/utils/validate-return-to';

/**
 * Handles OAuth callback processing
 *
 * After OAuth, the backend redirects here. The browser has the better-auth
 * session cookie (set by backend). This handler:
 * 1. Calls backend /auth/token with credentials to get JWT
 * 2. Sets raffly auth cookies
 * 3. Redirects to /browse
 *
 * IMPORTANT: Token exchange MUST be client-side because:
 * - The better-auth.session_token cookie is set on the backend domain
 * - Only the browser can send cross-origin cookies with credentials: 'include'
 * - Server actions run on frontend domain and cannot see backend cookies
 */
export function CallbackHandler() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(true);

	// mount: exchange the OAuth session cookie (set on backend domain) for a JWT,
	// then set raffly auth cookies and redirect. Must run client-side because
	// only the browser can send the cross-origin better-auth.session_token cookie.
	// Deps: [router, searchParams] — both are stable references from Next.js hooks.
	// Cleanup: AbortController cancels in-flight fetch on unmount.
	useEffect(() => {
		const controller = new AbortController();
		// Prevents React 18 strict mode double-execution from firing duplicate token exchanges
		let handled = false;

		async function handleCallback() {
			if (handled) return;
			handled = true;

			try {
				// Step 1: Check for OAuth error in URL params
				const oauthError = searchParams.get('error');
				if (oauthError) {
					track(AUTH_EVENTS.SIGN_IN_FAILED, {
						method: 'social',
						error_code: oauthError,
					});
					setError('Google sign in was cancelled or failed. Please try again.');
					setIsProcessing(false);
					return;
				}

				// Step 2: Exchange session cookie for JWT token (browserClient sends cookies).
				// Pass abort signal so unmount cancels the in-flight request.
				const response = await browserClient.get<{ token?: string }>(
					'/auth/token',
					{ signal: controller.signal },
				);

				if (controller.signal.aborted) return;

				if (!response.data.token) {
					setError('Failed to complete sign in. Please try signing in again.');
					setIsProcessing(false);
					return;
				}

				// Step 3: Set raffly auth cookies via server action
				const cookieResult = await setAuthCookiesClient(response.data.token);

				if (controller.signal.aborted) return;

				if (!cookieResult.success) {
					setError('Failed to complete sign in. Please try signing in again.');
					setIsProcessing(false);
					return;
				}

				// Track OAuth/magic-link sign-in completion — all social logins resolve here.
				// Method cannot be determined client-side (OAuth + magic-link both redirect here),
				// so we track as 'callback' and let Mixpanel attribute via the prior SIGN_IN_STARTED event.
				track(AUTH_EVENTS.SIGN_IN_COMPLETED, { method: 'callback' });

				// Step 4: Redirect to validated returnTo or default to browse
				const returnTo = validateReturnTo(searchParams.get('returnTo'));
				router.push(returnTo);
				router.refresh();
			} catch (err) {
				// Aborted requests are expected on unmount — don't log or show errors
				if (controller.signal.aborted) return;

				const errorCode = mapAuthError(err);
				captureServiceError(err, errorCode, {
					service: 'auth',
					action: 'oauth-callback-token-exchange',
				});
				setError('An unexpected error occurred. Please try again.');
				setIsProcessing(false);
			}
		}

		handleCallback();
		return () => controller.abort();
	}, [router, searchParams]);

	if (error) {
		return (
			<div className="flex flex-col items-center gap-4 text-center">
				<p className="text-red-600">{error}</p>
				<Button asChild>
					<Link href="/sign-in">Back to Sign In</Link>
				</Button>
			</div>
		);
	}

	if (isProcessing) {
		return (
			<div className="flex flex-col items-center gap-4">
				<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
				<p className="text-muted-foreground">Completing sign in...</p>
			</div>
		);
	}

	return null;
}
