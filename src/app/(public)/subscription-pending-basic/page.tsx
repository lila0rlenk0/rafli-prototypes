import type { Metadata } from 'next';

import { SubscribeNavbar } from '@/components/subscribe/navbar';
import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
} from '@/components/subscribe/plans';
import { parsePendingSubscriptionEmail } from '@/components/subscribe/post-payment';
import { SubscriptionPendingCard } from '@/components/subscribe/subscription-pending-card';

// Pin the Basic plan at the route level — each subscription-pending-*
// page targets one tier so the post-payment confirmation surfaces the
// correct credit value ($11). See the matching note on
// `/subscribe-basic` for the binding rationale.
const PLAN = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.BASIC];

const TITLE = 'Check your email';
const DESCRIPTION = `Your ${PLAN.name} Access Pass is queued — we just emailed a one-click sign-in link to finish claiming your $${PLAN.payoutUsd} in credits.`;

/**
 * `/subscription-pending-basic` — landing the buyer hits IMMEDIATELY
 * after Fanbasis captures the first Basic Access Pass charge, BEFORE
 * the webhook fulfillment runs and BEFORE the Better-Auth magic-link
 * email arrives.
 *
 * End-to-end flow:
 * 1. Buyer submits email on `/subscribe-basic`, gets redirected to
 *    Fanbasis hosted page.
 * 2. Buyer pays. Fanbasis redirects browser here (with `email`,
 *    `payment_id`, `product_name`, etc. echoed back as query params).
 * 3. In parallel: Fanbasis webhook fulfills the subscription on the
 *    backend — either grants the first cycle's credits (existing user)
 *    or queues a pending grant (unknown email), then fires the
 *    magic-link send.
 * 4. Buyer reads the email, clicks the link → Better-Auth verifies,
 *    sets session, redirects to `/subscription-success-basic`.
 *
 * NOT auth-aware: even if the buyer happens to already have a session
 * for a DIFFERENT email, the new credits land on the email they entered
 * at checkout, so the "check your email" instruction is correct
 * regardless of current session state. Render-time `getSession()` is
 * intentionally not called.
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

interface SubscriptionPendingBasicPageProps {
	// Next.js 16 — searchParams resolves to a plain object after await.
	// `string | string[] | undefined` mirrors Next.js's inferred shape for
	// repeated keys; the parser collapses arrays to their first value.
	readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SubscriptionPendingBasicPage({
	searchParams,
}: SubscriptionPendingBasicPageProps) {
	const params = await searchParams;
	const email = parsePendingSubscriptionEmail(params.email);

	return (
		// Mirror `/subscription-success-basic`'s shell so both
		// post-payment surfaces feel like the same flow — same navbar,
		// same min-height math, same overflow guard so any future
		// full-bleed bleed doesn't spawn a horizontal scroll container
		// on mobile Safari.
		<main className="bg-brand-mint relative min-h-dvh overflow-x-clip">
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<SubscriptionPendingCard plan={PLAN} email={email} />
				</section>
			</SubscribeNavbar>
		</main>
	);
}
