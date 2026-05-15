import type { Event } from '@sentry/nextjs';

/**
 * Sentry event processor that stamps `x-vercel-id` onto every captured
 * event. Joins a Sentry issue to its Vercel log line via
 * `vercel logs --request-id <id>`.
 *
 * Reads from `event.request.headers` (auto-populated by Sentry's
 * `requestDataIntegration`) instead of calling `headers()` from
 * `next/headers`. Calling `headers()` here would throw inside `'use cache'`
 * scopes — Next 16 forbids per-request reads in cache, and the runtime
 * check isn't reliably caught by try/catch. The SDK has already captured
 * the request headers by the time this processor fires, so we read from
 * the event payload itself.
 *
 * @see https://nextjs.org/docs/messages/next-request-in-use-cache
 *
 * @param event - Sentry event about to be shipped
 * @returns The mutated event (never null — we only annotate)
 */
export function attachVercelIdTag(event: Event): Event {
	const raw = event.request?.headers?.['x-vercel-id'];
	const vercelId = Array.isArray(raw) ? raw[0] : raw;
	if (vercelId) {
		event.tags = { ...event.tags, vercelId };
	}
	return event;
}
