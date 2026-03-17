'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Root-level error boundary.
 * Catches errors in the root layout and reports to Sentry.
 */
export default function GlobalError({
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
