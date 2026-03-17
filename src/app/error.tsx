'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Route-level error boundary.
 * Catches unhandled errors in page components and reports to Sentry.
 */
export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4">
			<h1 className="text-2xl font-bold">Something went wrong</h1>
			<button
				onClick={reset}
				className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
			>
				Try again
			</button>
		</div>
	);
}
