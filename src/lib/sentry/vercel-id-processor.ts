import type { Event } from '@sentry/nextjs';
import { headers } from 'next/headers';

/**
 * Sentry event processor that stamps `x-vercel-id` onto every captured
 * event. Joins a Sentry issue to its Vercel log line via
 * `vercel logs --request-id <id>`.
 *
 * Wrapped in try/catch because event processors can fire outside request
 * scope (build-time errors, background tasks) where `headers()` throws.
 *
 * @param event - Sentry event about to be shipped
 * @returns The mutated event (never null — we only annotate)
 */
export async function attachVercelIdTag(event: Event): Promise<Event> {
	try {
		const requestHeaders = await headers();
		const vercelId = requestHeaders.get('x-vercel-id');
		if (vercelId) {
			event.tags = { ...event.tags, vercelId };
		}
	} catch {
		// outside request scope — nothing to attach
	}
	return event;
}
