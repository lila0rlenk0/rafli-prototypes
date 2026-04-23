'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useOAuthCallbackExchange } from '@/services/auth/use-oauth-callback-exchange';

/**
 * Handles OAuth callback processing.
 *
 * After OAuth, the backend redirects here. The browser already holds the
 * better-auth session cookie (set on the backend domain). The actual
 * token-exchange + cookie-set side effect lives in
 * `useOAuthCallbackExchange` so this component only owns the UI surface.
 *
 * Token exchange MUST run in the browser because the better-auth session
 * cookie is on the backend domain and only `credentials: 'include'` from
 * the browser carries it across origins. A server action would not see it.
 *
 * @returns The status UI for the OAuth landing page
 */
export function OauthCallbackFlow() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const exchange = useOAuthCallbackExchange();

	// mount: a navigation landing handler — fire the OAuth exchange exactly
	// once. `mutate` is stable across renders; depending on `searchParams`
	// re-runs the exchange if Next.js swaps the snapshot mid-flight.
	useEffect(() => {
		exchange.mutate({ searchParams, router });
	}, [exchange, searchParams, router]);

	if (exchange.isError) {
		return (
			<div className="flex flex-col items-center gap-4 text-center">
				<p className="text-red-600">{exchange.errorMessage}</p>
				<Button asChild>
					<Link href="/sign-in">Back to Sign In</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
			<p className="text-muted-foreground">Completing sign in...</p>
		</div>
	);
}
