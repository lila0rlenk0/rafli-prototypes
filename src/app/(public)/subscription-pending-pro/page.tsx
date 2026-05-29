import type { Metadata } from 'next';

import { SubscriptionPendingPage } from '@/components/subscribe/subscription-pending-page';
import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
} from '@/components/subscribe/plans';

// Pin the Pro plan at the route level — each subscription-pending-*
// page targets one tier so the post-payment confirmation surfaces the
// correct credit value ($125). See the matching note on `/subscribe-pro`
// for the binding rationale.
const PLAN = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.PRO];

const TITLE = 'Check your email';
const DESCRIPTION = `Your ${PLAN.name} Access Pass is queued — we just emailed a one-click sign-in link to finish claiming your $${PLAN.payoutUsd} in credits.`;

/**
 * `/subscription-pending-pro` — landing the buyer hits IMMEDIATELY
 * after Fanbasis captures the first Pro Access Pass charge, BEFORE the
 * webhook fulfillment runs and BEFORE the Better-Auth magic-link email
 * arrives.
 *
 * See `SubscriptionPendingPage` for the full end-to-end flow and render
 * logic. The only per-route delta is the pinned tier.
 *
 * `noindex` because a crawler hitting this URL outside the funnel has
 * no email param and would render the generic copy, which has zero SEO
 * value.
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

interface SubscriptionPendingProPageProps {
	readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SubscriptionPendingProPage({
	searchParams,
}: SubscriptionPendingProPageProps) {
	return (
		<SubscriptionPendingPage plan={PLAN} searchParams={await searchParams} />
	);
}
