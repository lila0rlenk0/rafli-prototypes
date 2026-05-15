import { getMySubscription } from '@/services/subscription/get-my-subscription';

interface AuthenticatedBrowseSummary {
	readonly hasSubscription: boolean;
}

/**
 * Subscription-only summary for the streamed subscribe-promo rail.
 *
 * `enrolledIds` was removed when the role badge moved off the up-front
 * paint path; rehydration via React Query is the future enhancement, so
 * fetching the enrolled list here would be speculative work.
 *
 * @returns `hasSubscription` flag for the current viewer; `false` on a
 *   fetch failure (fail-open — show upsell rather than hide it).
 */
export async function loadAuthenticatedBrowseSummary(): Promise<AuthenticatedBrowseSummary> {
	// `getMySubscription` returns the wrapper `{ subscription, capabilities,
	// lockedProvider }`; for the upsell-rail gate we only care whether the
	// embedded entity exists (a churned user with `subscription: null` should
	// see the promo, even though their `capabilities` / `lockedProvider` may
	// be non-null from prior history).
	const subscriptionResult = await getMySubscription();
	const hasSubscription =
		subscriptionResult.success && subscriptionResult.data.subscription !== null;
	return { hasSubscription };
}
