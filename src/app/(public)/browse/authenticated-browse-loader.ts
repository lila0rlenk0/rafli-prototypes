import { getEnrolledRaffles } from '@/services/raffle/get-enrolled-raffles';
import { getMySubscription } from '@/services/subscription/get-my-subscription';
import { RAFFLE_STATUS } from '@/types/raffle';

export interface AuthenticatedBrowseSummary {
	enrolledIds: Set<string>;
	hasSubscription: boolean;
}

/** Live enrollments (max 100) and subscription; subscription errors are fail-open (show upsell). */
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
