'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useVerifyEmailExchange } from '@/services/auth/use-verify-email-exchange';

interface VerifyEmailFlowProps {
	token: string;
}

/**
 * Handles email verification processing.
 *
 * The verification mutation lives in `useVerifyEmailExchange` so the route
 * component never imports `@/services/*` into a `useEffect` body —
 * `data-fetching.md` forbids that pattern.
 *
 * Flow:
 * 1. Calls server action `verifyEmail` with the token
 * 2. On success with JWT: sets auth cookies and redirects to `/browse`
 * 3. On success without JWT: redirects to `/sign-in`
 * 4. On failure: shows error with retry/sign-in options
 *
 * @returns Processing spinner, error state with actions, or null when redirecting
 */
export function VerifyEmailFlow({ token }: VerifyEmailFlowProps) {
	const router = useRouter();
	const exchange = useVerifyEmailExchange();

	// mount: trigger verification once. `mutate` is stable; depending on
	// `token`/`router` re-runs verification only if either reference swaps.
	useEffect(() => {
		exchange.mutate({ token, router });
	}, [exchange, token, router]);

	if (exchange.isError) {
		return (
			<div className="flex flex-col items-center gap-4 text-center">
				<p className="text-red-600">{exchange.errorMessage}</p>
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

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
			<p className="text-muted-foreground">Verifying your email...</p>
		</div>
	);
}
