import * as Sentry from '@sentry/nextjs';
import type { ZodError } from 'zod';

/**
 * Captures a service error in Sentry with the error code tag.
 * The `beforeSend` filter in `filter.ts` uses the tag to drop expected errors.
 *
 * @param error - Original caught error
 * @param errorCode - Typed error code from the domain error mapper
 * @param context - Additional context (service name, payload IDs, etc.)
 */
export function captureServiceError(
	error: unknown,
	errorCode: string,
	context?: Record<string, string>,
): void {
	Sentry.withScope(scope => {
		scope.setTag('errorCode', errorCode);
		scope.setLevel('error');

		if (context) {
			scope.setContext('service', context);
		}

		Sentry.captureException(error);
	});
}

/**
 * Captures a Zod validation failure on an API response.
 *
 * These indicate **contract drift** — the backend changed its response shape
 * without a corresponding frontend update. This is a critical infrastructure
 * signal (not a user error) and should always reach Sentry.
 *
 * @param error - ZodError from `.parse()` on the API response
 * @param service - Domain name (e.g. "payment", "raffle")
 * @param action - Server action name (e.g. "pay-with-credits")
 */
export function captureContractDrift(
	error: ZodError,
	service: string,
	action: string,
): void {
	Sentry.withScope(scope => {
		scope.setTag('errorCode', 'contract_drift');
		scope.setTag('service', service);
		scope.setTag('action', action);
		scope.setLevel('error');

		// Attach the Zod issue array so the exact field mismatches are visible in Sentry
		scope.setContext('zodIssues', {
			issues: error.issues.map(issue => ({
				path: issue.path.join('.'),
				code: issue.code,
				message: issue.message,
			})),
		});

		Sentry.captureException(error);
	});
}
