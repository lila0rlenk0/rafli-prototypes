'use client';

import { Button } from '@/components/ui/button';
import { setAuthCookiesClient } from '@/lib/auth/session-client';
import { captureServiceError } from '@/lib/sentry/capture';
import { mapAuthError } from '@/lib/errors';
import { verifyEmail } from '@/services/auth/verify-email';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface VerifyEmailHandlerProps {
	token: string;
}

/**
 * Handles email verification processing.
 *
 * 'use client' required: uses useEffect for mount-only verification,
 * useRouter for post-verification redirect, and useState for error/loading state.
 *
 * Flow:
 * 1. Calls server action verifyEmail with the token
 * 2. On success with JWT: sets auth cookies and redirects to /browse (auto-sign-in)
 * 3. On success without JWT: redirects to /sign-in (manual sign-in needed)
 * 4. On failure: shows error with retry/sign-in options
 *
 * @returns Processing spinner, error state with actions, or null when redirecting
 */
export function VerifyEmailHandler({ token }: VerifyEmailHandlerProps) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(true);

	// mount: verify the email token and auto-sign-in if backend returns a JWT.
	// Runs once on mount — token is a static prop from the server, router is stable.
	// Cleanup: AbortController-style flag prevents state updates after unmount.
	useEffect(() => {
		// Prevents React 18 strict mode double-execution from firing duplicate verifications
		let cancelled = false;

		async function handleVerification() {
			try {
				// Step 1: Call server action to verify email with the token from the URL
				const result = await verifyEmail(token);

				if (cancelled) return;

				if (!result.success) {
					setError(
						'This verification link is invalid or has expired. Please request a new one.',
					);
					setIsProcessing(false);
					return;
				}

				// Step 2: Auto-sign-in if backend returned a JWT token
				if (result.data.token) {
					const cookieResult = await setAuthCookiesClient(result.data.token);

					if (cancelled) return;

					if (!cookieResult.success) {
						// Email verified but cookie setting failed — redirect to manual sign-in
						router.push('/sign-in');
						return;
					}

					router.push('/browse');
					router.refresh();
					return;
				}

				// Step 3: No token — email verified but user must sign in manually
				router.push('/sign-in');
			} catch (err) {
				if (cancelled) return;

				const errorCode = mapAuthError(err);
				captureServiceError(err, errorCode, {
					service: 'auth',
					action: 'verify-email-handler',
				});
				setError('An unexpected error occurred. Please try again.');
				setIsProcessing(false);
			}
		}

		handleVerification();
		return () => {
			cancelled = true;
		};
	}, [token, router]);

	// Guard: error state — show retry and sign-in options
	if (error) {
		return (
			<div className="flex flex-col items-center gap-4 text-center">
				<p className="text-red-600">{error}</p>
				<div className="flex gap-3">
					<Button asChild variant="outline">
						<Link href="/auth/resend-verification">
							Resend Verification Email
						</Link>
					</Button>
					<Button asChild>
						<Link href="/sign-in">Go to Sign In</Link>
					</Button>
				</div>
			</div>
		);
	}

	// Processing state — spinner while verification is in-flight
	if (isProcessing) {
		return (
			<div className="flex flex-col items-center gap-4">
				<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
				<p className="text-muted-foreground">Verifying your email...</p>
			</div>
		);
	}

	// Null state — reached briefly after success before router.push completes
	return null;
}
