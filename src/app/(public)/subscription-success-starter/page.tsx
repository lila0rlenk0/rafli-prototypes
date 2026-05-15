import type { Metadata } from 'next';

import { SubscribeNavbar } from '@/components/subscribe/navbar';
import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
} from '@/components/subscribe/plans';
import { shouldTrackPublicSubscriptionClaim } from '@/components/subscribe/post-payment';
import { SubscriptionSuccessCard } from '@/components/subscribe/subscription-success-card';
import { PUBLIC_CREDIT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { getSession } from '@/lib/auth/session';

// Pin the Starter plan at the route level — each subscription-success-*
// page targets one tier so the success card surfaces the correct credit
// value ($30) and the expired-link fallback routes back to the matching
// subscribe-* landing.
const PLAN = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.STARTER];

const TITLE = `${PLAN.name} credits claimed`;
const DESCRIPTION = `Your $${PLAN.payoutUsd} in Rafli credits from the ${PLAN.name} Access Pass are ready — jump into an active raffle and enter in seconds.`;

/**
 * `/subscription-success-starter` — Better-Auth magic-link callback
 * for the Starter Access Pass funnel ONLY.
 *
 * See `/subscription-success-basic` for the full flow and the
 * two-state render rationale — the only delta is the pinned tier
 * (which drives the credit-value copy and the fallback CTA target).
 */
export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	robots: {
		index: false,
		follow: false,
		nocache: true,
	},
};

export default async function SubscriptionSuccessStarterPage() {
	const session = await getSession();

	const userId = session?.user?.id;
	if (shouldTrackPublicSubscriptionClaim({ userId })) {
		void trackAfter(PUBLIC_CREDIT_EVENTS.CLAIMED, {}, { userId });
	}

	return (
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<SubscriptionSuccessCard plan={PLAN} hasSession={Boolean(session)} />
				</section>
			</SubscribeNavbar>
		</main>
	);
}
