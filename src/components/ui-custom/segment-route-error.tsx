'use client';

import { useEffect } from 'react';

import { captureErrorBoundary } from '@/lib/sentry/capture';

/**
 * Shared segment `error.tsx` UI — client boundary required for retry + Sentry.
 *
 * Uses `unstable_retry` (Next 16.2.0) over the legacy `reset`: most segment
 * errors in this app bubble up from server actions calling the BFF, so the
 * user-facing "Try again" must re-fetch + re-render, not just clear state.
 * The `unstable_` prefix acknowledges the API may shift before GA.
 */
export function SegmentRouteError({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	useEffect(() => {
		captureErrorBoundary(error);
	}, [error]);

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-4">
			<h1 className="text-2xl font-bold">Something went wrong</h1>
			<button
				type="button"
				onClick={() => unstable_retry()}
				className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
			>
				Try again
			</button>
		</div>
	);
}
