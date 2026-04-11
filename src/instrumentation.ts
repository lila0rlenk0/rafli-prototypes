import * as Sentry from '@sentry/nextjs';

/**
 * Next.js instrumentation hook.
 * Initializes Sentry for the appropriate runtime (Node or Edge).
 * Runs once when the server starts — imports the corresponding config file
 * which calls `Sentry.init()` as a side effect.
 */
export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		await import('../sentry.server.config');
	}

	if (process.env.NEXT_RUNTIME === 'edge') {
		await import('../sentry.edge.config');
	}
}

/**
 * Captures unhandled server-side request errors in Sentry.
 * Covers Server Components, middleware, and proxy errors.
 */
export const onRequestError = Sentry.captureRequestError;
