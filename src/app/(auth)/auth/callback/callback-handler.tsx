'use client';

import { Button } from '@/components/ui/button';
import { browserClient } from '@/lib/api/client-browser';
import { setAuthCookiesClient } from '@/lib/auth/session-client';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Handles OAuth callback processing
 *
 * After OAuth, the backend redirects here. The browser has the better-auth
 * session cookie (set by backend). This handler:
 * 1. Calls backend /api/auth/token with credentials to get JWT
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

	useEffect(() => {
		async function handleCallback() {
			try {
				// Step 1: Check for OAuth error in URL params
				const oauthError = searchParams.get('error');
				if (oauthError) {
					setError(
						'Google sign in was cancelled or failed. Please try again.',
					);
					setIsProcessing(false);
					return;
				}

				// Step 2: Exchange session cookie for JWT token
				// browserClient sends cookies automatically via withCredentials
				const response = await browserClient.get<{ token?: string }>(
					'/api/auth/token',
				);

				if (!response.data.token) {
					setError('Failed to complete sign in. Please try signing in again.');
					setIsProcessing(false);
					return;
				}

				// Step 3: Set raffly auth cookies via server action
				const cookieResult = await setAuthCookiesClient(response.data.token);

				if (!cookieResult.success) {
					setError('Failed to complete sign in. Please try signing in again.');
					setIsProcessing(false);
					return;
				}

				// Step 4: Redirect to returnTo or default to browse
				const returnTo = searchParams.get('returnTo') || '/browse';
				router.push(returnTo);
				router.refresh();
			} catch (err) {
				if (err instanceof AxiosError) {
					console.error('Token exchange failed:', err.response?.status);
				} else {
					console.error('Callback error:', err);
				}
				setError('An unexpected error occurred. Please try again.');
				setIsProcessing(false);
			}
		}

		handleCallback();
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
