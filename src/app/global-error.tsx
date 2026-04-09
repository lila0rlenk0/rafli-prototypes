'use client';

import { useEffect } from 'react';

import { captureErrorBoundary } from '@/lib/sentry/capture';

/**
 * Root-level error boundary.
 * Catches errors in the root layout itself and reports to Sentry.
 * Must render its own <html>/<body> since the root layout has errored.
 * 'use client' required — error boundaries need browser interactivity (reset button).
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	// mount: report error to Sentry — fires once per error instance,
	// re-fires if React replaces the error object after a retry
	useEffect(() => {
		captureErrorBoundary(error);
	}, [error]);

	return (
		<html lang="en">
			<body>
				<div className="flex min-h-screen flex-col items-center justify-center gap-4">
					<h1 className="text-2xl font-bold">Something went wrong</h1>
					<button
						onClick={reset}
						className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
