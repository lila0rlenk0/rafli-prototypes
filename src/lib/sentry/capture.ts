import * as Sentry from '@sentry/nextjs';

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
