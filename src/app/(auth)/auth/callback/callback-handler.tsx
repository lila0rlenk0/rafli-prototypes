'use client';

import { Button } from '@/components/ui/button';
import { exchangeSocialToken } from '@/services/auth/exchange-social-token';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Handles OAuth callback processing
 *
 * After OAuth, the backend redirects to this page with better-auth cookies
 * set automatically. This handler exchanges those cookies for JWT token
 * and sets raffly cookies, then redirects to /browse.
 */
export function CallbackHandler() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		async function handleCallback() {
			try {
				// Check for OAuth error in URL params first
				const oauthError = searchParams.get('error');
				if (oauthError) {
					setError('Google sign in was cancelled or failed. Please try again.');
					setIsProcessing(false);
					return;
				}

				// Exchange better-auth cookies for JWT token
				// The server action reads better-auth.session_data and better-auth.state
				// cookies that were set automatically by the backend
				const result = await exchangeSocialToken();

				if (!result.success) {
					setError('Failed to complete sign in. Please try signing in again.');
					setIsProcessing(false);
					return;
				}

				// Success - redirect to /browse
				router.push('/browse');
				router.refresh();
			} catch (err) {
				console.error('Callback error:', err);
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
