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
 * Flow:
 * 1. Calls backend GET /api/v1/auth/verify-email with the token
 * 2. On success with JWT: sets auth cookies and redirects to /browse (auto-sign-in)
 * 3. On success without JWT: redirects to /sign-in (manual sign-in needed)
 * 4. On failure: shows error with retry/sign-in options
 */
export function VerifyEmailHandler({ token }: VerifyEmailHandlerProps) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		async function handleVerification() {
			try {
				const result = await verifyEmail(token);

				if (!result.success) {
					setError(
						'This verification link is invalid or has expired. Please request a new one.',
					);
					setIsProcessing(false);
					return;
				}

				// Auto-sign-in: backend returned a JWT token
				if (result.data.token) {
					const cookieResult = await setAuthCookiesClient(
						result.data.token,
					);

					if (!cookieResult.success) {
						// Email verified but cookie setting failed — redirect to sign-in
						router.push('/sign-in');
						return;
					}

					router.push('/browse');
					router.refresh();
					return;
				}

				// No token — email verified but user must sign in manually
				router.push('/sign-in');
			} catch (err) {
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
	}, [token, router]);

	if (error) {
		return (
			<div className="flex flex-col items-center gap-4 text-center">
				<p className="text-red-600">{error}</p>
				<div className="flex gap-3">
					<Button asChild>
						<Link href="/sign-in">Go to Sign In</Link>
					</Button>
				</div>
			</div>
		);
	}

	if (isProcessing) {
		return (
			<div className="flex flex-col items-center gap-4">
				<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
				<p className="text-muted-foreground">Verifying your email...</p>
			</div>
		);
	}

	return null;
}
