import { after } from 'next/server';

const AFTER_OUTSIDE_REQUEST_SCOPE =
	'`after` was called outside a request scope';

/**
 * Schedules non-blocking follow-up work after the response when request scope exists.
 *
 * Integration tests call server actions directly, outside Next.js request context.
 * In that environment `after()` throws synchronously, so we fall back to immediate
 * fire-and-forget execution instead of letting analytics/cache side effects break the action.
 *
 * @param task - The async or sync task to run after the response
 */
export function runAfter(task: () => void | Promise<void>): void {
	try {
		after(task);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes(AFTER_OUTSIDE_REQUEST_SCOPE)
		) {
			void task();
			return;
		}

		throw error;
	}
}
