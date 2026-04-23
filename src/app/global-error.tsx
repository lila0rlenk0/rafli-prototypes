'use client';

import { useEffect } from 'react';

import { captureErrorBoundary } from '@/lib/sentry/capture';

/**
 * Root-level error boundary.
 * Catches errors in the root layout itself and reports to Sentry.
 * Must render its own <html>/<body> since the root layout has errored.
 * 'use client' required — error boundaries need browser interactivity.
 *
 * Uses `unstable_retry` (Next 16.2.0) instead of the legacy `reset`:
 * re-fetches + re-renders the root segment so transient root-layout
 * failures (network hiccup on a Server Component fetch) recover without
 * a full page reload. The `unstable_` prefix acknowledges the API may
 * shift before GA.
 */
export default function GlobalError({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	// mount: report error to Sentry — fires once per error instance,
	// re-fires if React replaces the error object after a retry
	useEffect(() => {
		captureErrorBoundary(error);
	}, [error]);

	return (
		<html lang="en">
			<body>
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
			</body>
		</html>
	);
}
