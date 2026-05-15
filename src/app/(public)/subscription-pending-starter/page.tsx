import type { Metadata } from 'next';

import { SubscribeNavbar } from '@/components/subscribe/navbar';
import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
} from '@/components/subscribe/plans';
import { parsePendingSubscriptionEmail } from '@/components/subscribe/post-payment';
import { SubscriptionPendingCard } from '@/components/subscribe/subscription-pending-card';

// Pin the Starter plan at the route level — each subscription-pending-*
// page targets one tier so the post-payment confirmation surfaces the
// correct credit value ($30). See the matching note on
// `/subscribe-starter` for the binding rationale.
const PLAN = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.STARTER];

const TITLE = 'Check your email';
const DESCRIPTION = `Your ${PLAN.name} Access Pass is queued — we just emailed a one-click sign-in link to finish claiming your $${PLAN.payoutUsd} in credits.`;

/**
 * `/subscription-pending-starter` — landing the buyer hits IMMEDIATELY
 * after Fanbasis captures the first Starter Access Pass charge, BEFORE
 * the webhook fulfillment runs and BEFORE the Better-Auth magic-link
 * email arrives.
 *
 * See `/subscription-pending-basic` for the full end-to-end flow — the
 * only delta is the pinned tier (which drives the credit-value copy
 * and the success-page redirect target).
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

interface SubscriptionPendingStarterPageProps {
	// Next.js 16 — searchParams resolves to a plain object after await.
	// `string | string[] | undefined` mirrors Next.js's inferred shape for
	// repeated keys; the parser collapses arrays to their first value.
	readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SubscriptionPendingStarterPage({
	searchParams,
}: SubscriptionPendingStarterPageProps) {
	const params = await searchParams;
	const email = parsePendingSubscriptionEmail(params.email);

	return (
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<SubscriptionPendingCard plan={PLAN} email={email} />
				</section>
			</SubscribeNavbar>
		</main>
	);
}
