import * as Sentry from '@sentry/nextjs';

/** Breadcrumb category for the raffle-creation wizard trail. */
const CREATE_RAFFLE_CATEGORY = 'raffle.create';

/**
 * Records a stage of the raffle-creation wizard as a Sentry breadcrumb.
 *
 * Breadcrumbs are buffered in the browser and only transmitted when an event
 * is later captured, so they cost nothing on the happy path while giving any
 * captured error — or the validation-block message raised when the "Create"
 * button is clicked with invalid fields — the full UI trail that led up to it:
 * which step the user was on, which pipeline stage ran, and where it stopped.
 *
 * @param message - Stage label (e.g. 'pipeline: raffle created')
 * @param data - Non-PII diagnostic fields (ids, counts, error codes)
 * @param level - Sentry severity; defaults to 'info'
 */
export function traceCreateRaffle(
	message: string,
	data?: Record<string, unknown>,
	level: 'info' | 'warning' | 'error' = 'info',
): void {
	Sentry.addBreadcrumb({
		category: CREATE_RAFFLE_CATEGORY,
		message,
		level,
		data,
	});
}
