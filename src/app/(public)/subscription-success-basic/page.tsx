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

// Pin the Basic plan at the route level — each subscription-success-*
// page targets one tier so the success card surfaces the correct
// credit value ($11) and the expired-link fallback routes back to the
// matching subscribe-* landing.
const PLAN = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.BASIC];

const TITLE = `${PLAN.name} credits claimed`;
const DESCRIPTION = `Your $${PLAN.payoutUsd} in Rafli credits from the ${PLAN.name} Access Pass are ready — jump into an active raffle and enter in seconds.`;

/**
 * `/subscription-success-basic` — Better-Auth magic-link callback for
 * the Basic Access Pass funnel ONLY.
 *
 * End-to-end flow:
 * 1. Visitor completes Fanbasis checkout, gets bounced to
 *    `/subscription-pending-basic` with the "check your email" state.
 * 2. Fanbasis webhook fulfills the subscription on the backend, which
 *    either grants the first cycle's credits to an existing user or
 *    queues a pending grant + sends a Better-Auth magic link.
 * 3. User clicks the email link. Better-Auth verifies, auto-creates
 *    the user if needed, sets the session cookie, fires the
 *    `accountCreatedTopic` (which drains the pending grant), and
 *    redirects here.
 *
 * Two-state render: session present → success card; no session →
 * "Magic link expired" fallback (the link genuinely was replayed or
 * timed out — the page is no longer hit by the Fanbasis success
 * redirect, so this branch can no longer mis-classify the
 * post-payment-pre-email state).
 *
 * No `searchParams` handling: the Better-Auth callback sets the
 * session cookie out-of-band and does not append params we care about;
 * adding surface here without a populated caller violates
 * `development.md`'s "no speculative props" rule.
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

export default async function SubscriptionSuccessBasicPage() {
	// `getSession()` is `cache()`-deduped per request — so even if a
	// downstream layout re-reads it (unlikely on this leaf page), only
	// one round-trip to the backend happens.
	const session = await getSession();

	// Mixpanel: fire exactly once per successful landing, and ONLY when
	// the session cookie resolved. This is the event that stitches the
	// anonymous `CHECKOUT_STARTED` properties (emitted before sign-in)
	// to the now-known user id — without it the funnel would show two
	// disjoint funnels. Deliberately not firing on the expired branch:
	// an unprovisioned landing is a distinct event class and deserves
	// its own signal if we ever need it, rather than polluting the
	// success metric.
	const userId = session?.user?.id;
	if (shouldTrackPublicSubscriptionClaim({ userId })) {
		void trackAfter(PUBLIC_CREDIT_EVENTS.CLAIMED, {}, { userId });
	}

	return (
		// `(public)/` has no parent layout, so this page owns its own
		// `<main>` shell. `min-h-dvh` beats `min-h-screen` on mobile
		// Safari; `overflow-x-clip` contains any future full-bleed
		// bleeds without spawning a scroll container.
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<SubscriptionSuccessCard plan={PLAN} hasSession={Boolean(session)} />
				</section>
			</SubscribeNavbar>
		</main>
	);
}
