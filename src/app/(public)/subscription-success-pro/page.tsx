import type { Metadata } from 'next';

import { SubscriptionSuccessPage } from '@/components/subscribe/subscription-success-page';
import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
} from '@/components/subscribe/plans';

// Pin the Pro plan at the route level — each subscription-success-*
// page targets one tier so the success card surfaces the correct credit
// value ($125) and the expired-link fallback routes back to the matching
// subscribe-* landing.
const PLAN = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.PRO];

const TITLE = `${PLAN.name} credits claimed`;
const DESCRIPTION = `Your $${PLAN.payoutUsd} in Rafli credits from the ${PLAN.name} Access Pass are ready — jump into an active raffle and enter in seconds.`;

/**
 * `/subscription-success-pro` — Better-Auth magic-link callback for
 * the Pro Access Pass funnel ONLY.
 *
 * See `SubscriptionSuccessPage` for the full flow, session handling, and
 * Mixpanel tracking rationale. The only per-route delta is the pinned tier.
 *
 * `noindex` because a crawler hitting this URL without a real
 * magic-link session would always fall into the expired branch,
 * poisoning search-results with an apparent error state.
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

export default async function SubscriptionSuccessProPage() {
	return <SubscriptionSuccessPage plan={PLAN} />;
}
