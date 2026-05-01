import { getEnrolledRaffles } from '@/services/raffle/get-enrolled-raffles';
import { getMySubscription } from '@/services/subscription/get-my-subscription';
import { RAFFLE_STATUS } from '@/types/raffle';

interface AuthenticatedBrowseSummary {
	readonly enrolledIds: ReadonlySet<string>;
	readonly hasSubscription: boolean;
}

/**
 * Guest-path summary — module-scoped so callers can pass it into
 * `Promise.all` without allocating a fresh `Set` per request. Treat as
 * read-only; mutating leaks across requests in a server runtime.
 */
export const EMPTY_BROWSE_SUMMARY: AuthenticatedBrowseSummary = {
	enrolledIds: new Set<string>(),
	hasSubscription: false,
};

/**
 * Live enrollments (max 100) and subscription; subscription errors are
 * fail-open (show upsell).
 *
 * @returns Set of enrolled raffle ids and a `hasSubscription` flag for the
 *   current viewer. Empty set + `false` on a fetch failure.
 */
export async function loadAuthenticatedBrowseSummary(): Promise<AuthenticatedBrowseSummary> {
	const [enrolledResponse, subscriptionResponse] = await Promise.all([
		getEnrolledRaffles({ status: RAFFLE_STATUS.LIVE, limit: 100 }),
		getMySubscription(),
	]);

	const enrolledIds = new Set<string>();
	if (enrolledResponse.success) {
		for (const r of enrolledResponse.data.raffles) {
			enrolledIds.add(r.id);
		}
	}

	const hasSubscription =
		subscriptionResponse.success && subscriptionResponse.data !== null;

	return { enrolledIds, hasSubscription };
}
