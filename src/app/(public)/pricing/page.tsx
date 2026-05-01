import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { BugIcon } from '@/assets/icons/bug-icon';
import { NoPurchaseNecessaryFootnote } from '@/components/compliance/no-purchase-necessary-footnote';
import { LaunchCountdown } from '@/components/pricing/countdown/launch-countdown';
import { PlanCard } from '@/components/pricing/plan-card';
import { PricingFaq } from '@/components/pricing/faq';
import { SubscribeResumeTrigger } from '@/components/pricing/subscribe/subscribe-resume-trigger';
import { SubscriptionCancelToast } from '@/components/pricing/subscribe/subscription-cancel-toast';
import { SubscriptionSuccessDialog } from '@/components/pricing/subscribe/subscription-success-dialog';
import { Button } from '@/components/ui/button';
import { LAUNCH_PRICING_WINDOW_MS } from '@/lib/feature-flags';
import { getSession } from '@/lib/auth/session';
import { getMySubscription } from '@/services/subscription/get-my-subscription';
import { getPlans } from '@/services/subscription/get-plans';

/**
 * Hero stat pills. Static for now — there's no endpoint that aggregates
 * lifetime prize value or platform-wide participant count today. When such
 * an endpoint exists, swap these for a fetch; the surface is scoped to the
 * hero so nothing else on the page needs to know.
 *
 * Split into `bold` + `suffix` because Figma renders the leading figure in
 * Geist SemiBold and the trailing copy in Geist Regular inside the same pill.
 * Concatenating into one string would force a mid-string font-weight swap
 * via `<strong>` — the tuple model keeps the JSX flat.
 *
 * Module-scoped so the array reference is stable across renders and React
 * doesn't re-key the list on navigation.
 */
const HERO_STATS: readonly { bold: string; suffix: string }[] = [
	{ bold: '$1,000,000+', suffix: 'in prizes distributed' },
	{ bold: '+100,000', suffix: 'active participants' },
];

/**
 * Bug-icon error card mirroring `/browse`'s failure state — renders when
 * `getPlans()` fails so the surface stays consistent across public pages.
 *
 * @returns Centered error card with a "Back to Browse" CTA.
 */
function PricingErrorState() {
	return (
		<div className="h-half-screen flex w-full flex-col items-center justify-center gap-10 text-center">
			<BugIcon />
			<hgroup className="flex flex-col gap-4">
				<h1 className="text-xl font-semibold">Unable to load pricing</h1>
				<p className="mt-2 text-lg">
					Something went wrong on our end. Please try again in a moment.
				</p>
			</hgroup>
			<Button asChild size="lg" className="font-semibold sm:px-12">
				<Link href="/browse">Back to Sweepstake Browse</Link>
			</Button>
		</div>
	);
}

/**
 * Pricing hero — eyebrow, headline, supporting copy, and stat pills.
 * Decor cluster lives at the layout level so the squares anchor to the
 * viewport, not the centered hero column.
 *
 * Typography mirrors `browse/hero-section.tsx` (Clash Display semibold,
 * fluid-ish sizing, tight leading) so the two hero surfaces feel authored
 * by the same hand.
 *
 * @returns Hero section with headline, copy, and stat pills.
 */
function PricingHero() {
	return (
		<section className="flex flex-col items-center gap-6 text-center">
			{/* Eyebrow tagline — Geist Medium on the foreground color. "Enhanced
			    odds" / "Risk-Free" were removed: in a sweepstakes context, those
			    phrases read as claims that paid entrants are advantaged over
			    AMOE entrants. Compliance requires identical odds across paid
			    and free paths — see /free-entry. */}
			<p className="text-foreground text-base/dense font-medium">
				Access the best opportunities. Risk-Free. Subscribe now to get access.
			</p>
			{/* Figma pins the desktop size to 48px (text-display-md) so the line
			    "Subscribe Today. Save. Win." sits ~30% larger than sub-section
			    H2s. Mobile keeps the 36px (text-4xl) baseline so the headline
			    doesn't wrap into four lines on a 360px viewport. */}
			<h1 className="font-clash-display sm:text-display-md text-4xl/none font-semibold">
				Subscribe Today. Save. Win.
			</h1>
			<p className="text-foreground text-base/dense max-w-(--container-launch-copy) font-normal text-balance">
				Rafli is LIVE. Subscribe now and lock in your share of exclusive perks,
				including free entries, discounts, and access to hundreds of new
				sweepstakes every month. Become a member of this community NOW.
			</p>
			<ul className="flex flex-wrap items-center justify-center gap-4">
				{HERO_STATS.map(stat => (
					<li
						key={stat.bold}
						className="bg-paper-100 inline-flex items-center gap-1 rounded-full border border-black px-3 py-0.5 text-sm"
					>
						{/* Solid mint dot reads as a "live counter" signal, not a
						    claim checkmark — more honest framing for stat pills. */}
						<span
							aria-hidden
							className="bg-green-vivid size-2 shrink-0 rounded-full"
						/>
						<span className="text-foreground font-semibold">{stat.bold}</span>
						<span className="text-foreground font-normal">{stat.suffix}</span>
					</li>
				))}
			</ul>
		</section>
	);
}

/**
 * Pricing Page — public-facing Server Component.
 *
 * Plans are the critical blocking data; my-subscription failure degrades
 * silently to the non-subscriber experience. Plans failure renders the
 * shared bug-icon error card.
 *
 * Caching: default RSC behavior. `getPlans` hits a public endpoint whose
 * payload rarely changes; if this becomes a hot path, wrap in
 * `unstable_cache` with a 5-minute revalidation — not done now because
 * the /pricing traffic pattern doesn't justify it.
 */
export default async function PricingPage() {
	// Step 1: Resolve the cookie-backed session first — local decode, no
	// network. The result decides whether we bother fetching the user's
	// subscription at all (guests would 401).
	const session = await getSession();
	const isAuthenticated = !!session;

	// Step 2: Parallel network work — plans are public; my-subscription is
	// only meaningful for authenticated viewers. `Promise.resolve(null)` on
	// the guest path keeps the tuple destructure clean without a branch.
	const [plansResult, currentSubResult] = await Promise.all([
		getPlans(),
		isAuthenticated ? getMySubscription() : Promise.resolve(null),
	]);

	// Step 3: Tolerate `/subscriptions/me` failures — a transient outage
	// should degrade to "no current plan highlight" rather than take down
	// the page. Sentry already captured the error in the service.
	const currentSubscription =
		currentSubResult && currentSubResult.success ? currentSubResult.data : null;

	if (!plansResult.success) return <PricingErrorState />;

	// Step 4: Stable display order. Backend orders by price ascending, but
	// `metadata.sortOrder` is the FE-authoritative key — Ops can pin a plan
	// without changing its price. `toSorted` keeps the input immutable.
	const plans = plansResult.data.plans.toSorted(
		(a, b) => a.metadata.sortOrder - b.metadata.sortOrder,
	);

	// Compile-time gate: null means launch pricing is off and the banner
	// stays hidden. The constant is a literal in `feature-flags.ts`, so no
	// runtime validation is needed — a malformed value would be a code-time
	// bug, not a deploy-time one.
	const countdownWindowMs = LAUNCH_PRICING_WINDOW_MS;
	const currentPlanId = currentSubscription?.plan.id ?? null;

	return (
		<div className="max-w-copy mx-auto flex w-full flex-col gap-10 px-4 py-8 sm:gap-14 sm:py-12">
			{/* Post-Stripe return handlers. Success opens a dialog (weighty
			    affordance for a paid conversion); cancel fires a toast (light
			    acknowledgement of an abandoned intent). Split by query-param
			    value so neither races the other's URL scrub. */}
			<SubscriptionSuccessDialog subscription={currentSubscription} />
			<SubscriptionCancelToast />
			{/* Auto-resume the Stripe handoff when the user lands here via
			    `/pricing?plan=<id>` after the unauth click round-tripped
			    through sign-in. Null render; side-effect only. Guests skip
			    the dispatch to avoid an infinite sign-in bounce. */}
			<SubscribeResumeTrigger isAuthenticated={isAuthenticated} />

			{/* Back link — Figma specs a heavier, larger affordance (22px SemiBold,
			    24px icon) than the small inline link used on the order detail page.
			    Mirrors the on-page "Back" anchors used across public marketing
			    surfaces where the nav is the only other tall element. */}
			<div>
				<Link
					href="/browse"
					className="focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-sm text-lg font-semibold text-black underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
				>
					<ArrowLeft className="size-6" aria-hidden />
					Back to Sweepstake Browse
				</Link>
			</div>

			<PricingHero />

			{/* Equal-prominence AMOE callout — every paid-entry surface on the
			    platform renders this footnote adjacent to the price so the free
			    path is never secondary to the paid path. Required by the UK
			    Gambling Act 2005 §14 test and the US state sweepstakes statutes
			    that apply identical-odds + equal-prominence rules. */}
			<NoPurchaseNecessaryFootnote />

			{/* Plan cards — `id="plans"` anchors the launch-countdown CTA so
			    clicking "Choose your subscription" scrolls back up to the grid.
			    The rotated "X% OFF" stickers live inside each PlanCard so they
			    stay anchored to the card's top-right corner across breakpoints. */}
			<section
				id="plans"
				aria-label="Subscription plans"
				className="grid gap-6 lg:grid-cols-2 lg:gap-8"
			>
				{plans.map(plan => (
					<PlanCard
						key={plan.id}
						plan={plan}
						isAuthenticated={isAuthenticated}
						// Current-plan treatment keys off a simple id match — the
						// pricing grid doesn't need to know about status nuance
						// (cancelled-but-still-active, past-due) here; those belong
						// on the profile management page.
						isCurrent={plan.id === currentPlanId}
					/>
				))}
			</section>

			{/* Launch countdown — gated server-side: env unset or deadline past
			    means no banner ever reaches the client. */}
			{countdownWindowMs !== null ? (
				<LaunchCountdown windowMs={countdownWindowMs} />
			) : null}

			<PricingFaq />
		</div>
	);
}
