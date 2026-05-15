import { CurrentPlanCard } from '@/components/profile/subscription';
import { getMySubscription } from '@/services/subscription/get-my-subscription';

/**
 * SubscriptionSection Component
 *
 * Server component that fetches `/me/subscription` and renders the profile-
 * side management card. Sole owner of cancel, change-plan, and update-payment-
 * method flows since the pricing page IA split: pricing handles acquisition;
 * `/profile#subscription` handles every post-purchase op.
 *
 * Gracefully degrades on fetch failure — the empty-state CTA targets the
 * pricing page so a transient outage still surfaces the recovery path.
 *
 * @returns Card with subscription summary + management CTAs, or empty-state.
 */
export async function SubscriptionSection() {
	const subscriptionResult = await getMySubscription();
	const wrapper = subscriptionResult.success ? subscriptionResult.data : null;

	return (
		<CurrentPlanCard
			subscription={wrapper?.subscription ?? null}
			capabilities={wrapper?.capabilities ?? null}
			lockedProvider={wrapper?.lockedProvider ?? null}
		/>
	);
}
