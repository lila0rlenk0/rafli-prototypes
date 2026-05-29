import { SubscribeNavbar } from '@/components/subscribe/navbar';
import { parsePendingSubscriptionEmail } from '@/components/subscribe/post-payment';
import { SubscribeShell } from '@/components/subscribe/subscribe-shell';
import { SubscriptionPendingCard } from '@/components/subscribe/subscription-pending-card';

import type { SubscribePlan } from './plans';

// Next.js 16 — searchParams resolves to a plain object after await.
// `string | string[] | undefined` mirrors Next.js's inferred shape for
// repeated keys; the parser collapses arrays to their first value.
type RawSearchParams = Record<string, string | string[] | undefined>;

interface SubscriptionPendingPageProps {
	readonly plan: SubscribePlan;
	readonly searchParams: RawSearchParams;
}

/**
 * Shared server component for all `subscription-pending-*` pages.
 *
 * Each route pins its own `PLAN` constant and delegates rendering here,
 * keeping route files to metadata + one-line render while the shell,
 * navbar, layout math, and email parsing live in one place.
 *
 * @param plan - The tier-specific plan config (Basic / Starter / Pro)
 * @param searchParams - Already-awaited searchParams from the page
 * @returns Post-payment "check your email" confirmation UI
 */
export function SubscriptionPendingPage({
	plan,
	searchParams,
}: SubscriptionPendingPageProps) {
	const email = parsePendingSubscriptionEmail(searchParams.email);

	return (
		<SubscribeShell background="mint">
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<SubscriptionPendingCard plan={plan} email={email} />
				</section>
			</SubscribeNavbar>
		</SubscribeShell>
	);
}
