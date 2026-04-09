import { Suspense } from 'react';
import { CallbackHandler } from './callback-handler';

/**
 * OAuth callback page
 *
 * Receives redirect from better-auth after OAuth flow completes.
 * Exchanges session for JWT and sets auth cookies.
 *
 * Server Component — no data fetching. CallbackHandler is a Client Component
 * wrapped in Suspense because it reads `useSearchParams` (triggers client-side bailout).
 * Suspense fallback shows a spinner while the client bundle loads.
 *
 * @returns Centered layout with Suspense-wrapped callback handler
 */
export default function AuthCallbackPage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			{/* Suspense needed: CallbackHandler uses useSearchParams which opts into client rendering */}
			<Suspense fallback={<CallbackLoading />}>
				<CallbackHandler />
			</Suspense>
		</div>
	);
}

/** Spinner fallback shown while CallbackHandler JS bundle loads */
function CallbackLoading() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
			<p className="text-muted-foreground">Completing sign in...</p>
		</div>
	);
}
