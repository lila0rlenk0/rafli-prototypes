import { Suspense } from 'react';
import { CallbackHandler } from './callback-handler';

/**
 * OAuth callback page
 *
 * Receives redirect from better-auth after OAuth flow completes.
 * Exchanges session for JWT and sets auth cookies.
 */
export default function AuthCallbackPage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<Suspense fallback={<CallbackLoading />}>
				<CallbackHandler />
			</Suspense>
		</div>
	);
}

function CallbackLoading() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			<p className="text-muted-foreground">Completing sign in...</p>
		</div>
	);
}
