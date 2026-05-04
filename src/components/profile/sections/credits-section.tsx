import { Star } from 'lucide-react';
import Link from 'next/link';

import { ManageSubscriptionPillButton } from '@/components/profile/manage-subscription-pill-button';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { getCreditBalance } from '@/services/payment/get-credit-balance';
import { getMySubscription } from '@/services/subscription/get-my-subscription';

// Statuses that grant subscriber benefits — `cancelled` keeps perks until
// `currentPeriodEnd`, `past_due` stays in dunning while Stripe retries the
// charge. `expired` users are functionally non-subscribers, so the upsell
// banner shows for them too. Module-scoped so the Set reference is stable
// across server-component renders.
const ENTITLED_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set([
	'active',
	'cancelled',
	'past_due',
]);

/**
 * CreditsSection Component
 *
 * Server component displaying the user's credit balance summary plus a
 * subscription-aware upsell. Shows: My Sub (plan name or "No active
 * subscription"), available balance, total earned, total spent. When the
 * viewer has no entitling subscription, surfaces a mint promo banner that
 * links to `/pricing` — this is where the credits flow becomes the upsell
 * surface for non-subscribers.
 *
 * Parallel-fetches credit balance and subscription per `data-fetching.md` so
 * the section's TTFB is bounded by the slower of the two reads, not their
 * sum. Both reads degrade silently — a transient endpoint failure shows
 * zeros + the upsell, which is the right default for an unauthenticated
 * fallback look without alarming the user.
 *
 * @returns Card with credit balance overview and conditional upsell banner.
 */
export async function CreditsSection() {
	// Step 1: Independent reads — fire in parallel. The credit balance is
	// authoritative for the dollar values; the subscription drives the My Sub
	// cell label and the visibility of the upsell banner.
	const [balanceResult, subscriptionResult] = await Promise.all([
		getCreditBalance(),
		getMySubscription(),
	]);

	// Step 2: Gracefully degrade to zeros if the balance endpoint fails — user
	// always sees their balance, even $0. Same pattern as before.
	const availableAmount = balanceResult.success
		? balanceResult.data.availableAmount
		: '0';
	const totalGranted = balanceResult.success
		? balanceResult.data.totalGranted
		: '0';
	const totalSpent = balanceResult.success
		? balanceResult.data.totalSpent
		: '0';
	// Show history link only when there's something to browse — no point linking to an empty table
	const hasHistory = parseFloat(totalGranted) > 0 || parseFloat(totalSpent) > 0;

	// Step 3: Resolve subscription state. A failed read collapses to "no
	// subscription" so the banner still shows — better to over-promote the
	// upsell on a transient outage than to hide it on an active user (the
	// CTA target itself is no-op for already-subscribed visitors).
	const subscription = subscriptionResult.success
		? subscriptionResult.data
		: null;
	const hasEntitlement =
		subscription !== null &&
		ENTITLED_SUBSCRIPTION_STATUSES.has(subscription.status);
	const subscriptionLabel = hasEntitlement
		? subscription.plan.name
		: 'No active subscription';

	return (
		<div
			className="relative flex w-full flex-col gap-8 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-14"
			id="credits"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<h3 className="font-clash-display text-headline-md flex-1 font-semibold text-black">
					Credits
				</h3>
				<div className="flex flex-wrap items-center gap-2">
					{hasHistory ? (
						<Link href="/profile/credits">
							<Button
								variant="outline"
								size="sm"
								className="border-brand-dark hover:bg-brand-dark px-6 font-semibold hover:text-white"
							>
								View History
							</Button>
						</Link>
					) : null}
					{hasEntitlement ? <ManageSubscriptionPillButton /> : null}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="flex flex-col gap-1">
					<span className="text-body-md text-ink-500 font-medium">My Sub</span>
					<span className="text-headline-sm text-foreground flex items-center gap-1 font-semibold">
						{hasEntitlement ? <Star className="size-5" aria-hidden /> : null}
						{subscriptionLabel}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-body-md text-ink-500 font-medium">
						Available Balance
					</span>
					<span className="font-clash-display text-headline-md font-semibold">
						{formatCurrency(availableAmount, 'USD')}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-body-md text-ink-500 font-medium">
						Total Earned
					</span>
					<span className="font-clash-display text-headline-md font-semibold">
						{formatCurrency(totalGranted, 'USD')}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-body-md text-ink-500 font-medium">
						Total Spent
					</span>
					<span className="font-clash-display text-headline-md font-semibold">
						{formatCurrency(totalSpent, 'USD')}
					</span>
				</div>
			</div>

			{/* Mint upsell banner — gated to non-entitled viewers so subscribers
			    don't see "Why pay full price?" copy that doesn't apply to them.
			    Routes to /pricing where the cancel-card lives, but for guests /
			    expired users it's the subscribe path. */}
			{hasEntitlement ? null : (
				<div className="bg-brand-mint border-brand-dark flex flex-col items-start justify-between gap-6 rounded-3xl border p-8 sm:flex-row sm:items-center">
					<div className="text-foreground flex flex-col gap-2">
						<h4 className="font-clash-display text-headline-md font-semibold">
							Why pay full price for entries?
						</h4>
						<p className="text-body-sm">
							Save up to 20% on every entry and get free access to the weekly
							pool.
						</p>
					</div>
					<Button
						asChild
						size="lg"
						className="rounded-full px-6 font-semibold sm:shrink-0"
					>
						<Link href="/pricing">Get Credits!</Link>
					</Button>
				</div>
			)}
		</div>
	);
}
