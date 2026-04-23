'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

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
	const { mutate } = exchange;

	// mount-only: verify the token exactly once per page load.
	// A `useRef` flag is required because the hook returns a fresh result
	// object each render (new `exchange` reference), and TanStack Query's
	// internal state transitions (pending → error) trigger re-renders that
	// would otherwise re-fire this effect in a loop, storming the verify
	// endpoint with concurrent requests. The ref also absorbs React
	// StrictMode's intentional double-invoke in development.
	const hasVerified = useRef(false);
	useEffect(() => {
		if (hasVerified.current) return;
		hasVerified.current = true;
		mutate({ token, router });
	}, [mutate, token, router]);

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
