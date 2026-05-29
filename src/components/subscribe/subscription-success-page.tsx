import { SubscribeNavbar } from '@/components/subscribe/navbar';
import { shouldTrackPublicSubscriptionClaim } from '@/components/subscribe/post-payment';
import { SubscribeShell } from '@/components/subscribe/subscribe-shell';
import { SubscriptionSuccessCard } from '@/components/subscribe/subscription-success-card';
import { PUBLIC_CREDIT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { getSession } from '@/lib/auth/session';

import type { SubscribePlan } from './plans';

interface SubscriptionSuccessPageProps {
	readonly plan: SubscribePlan;
}

/**
 * Shared async server component for all `subscription-success-*` pages.
 *
 * Each route pins its own `PLAN` constant and delegates rendering here.
 * Session resolution, Mixpanel tracking, and the two-state render (session
 * present → success card; no session → expired-link fallback via the card)
 * all live in one place rather than being copied three times.
 *
 * Two-state render: session present → success card; no session →
 * "Magic link expired" fallback (the link genuinely was replayed or timed
 * out). `getSession()` is `cache()`-deduped per request — one round-trip
 * to the backend regardless of how many RSCs read it.
 *
 * @param plan - The tier-specific plan config (Basic / Starter / Pro)
 * @returns Post-magic-link success or expired-link UI
 */
export async function SubscriptionSuccessPage({
	plan,
}: SubscriptionSuccessPageProps) {
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
		<SubscribeShell>
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<SubscriptionSuccessCard plan={plan} hasSession={Boolean(session)} />
				</section>
			</SubscribeNavbar>
		</SubscribeShell>
	);
}
