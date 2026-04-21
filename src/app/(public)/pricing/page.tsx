import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { BugIcon } from '@/assets/icons/bug-icon';
import { NoPurchaseNecessaryFootnote } from '@/components/compliance/no-purchase-necessary-footnote';
import { LaunchCountdown } from '@/components/pricing/launch-countdown';
import { PlanCard } from '@/components/pricing/plan-card';
import { PricingFaq } from '@/components/pricing/pricing-faq';
import { SubscribeResumeTrigger } from '@/components/pricing/subscribe-resume-trigger';
import { SubscriptionCancelToast } from '@/components/pricing/subscription-cancel-toast';
import { SubscriptionSuccessDialog } from '@/components/pricing/subscription-success-dialog';
import { LAUNCH_PRICING_ENDS_AT } from '@/lib/feature-flags';
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
 * Exported-adjacent (module-scoped) so the array reference is stable across
 * renders and React doesn't re-key the list on navigation.
 */
const HERO_STATS: readonly { bold: string; suffix: string }[] = [
	{ bold: '$1,000,000+', suffix: 'in prizes distributed' },
	{ bold: '+100,000', suffix: 'active participants' },
];

/**
 * Determines whether the launch-pricing countdown should render.
 *
 * Two gates:
 *   1. `LAUNCH_PRICING_ENDS_AT` must be set — null means launch pricing
 *      has no deadline (or is over), so the banner stays hidden.
 *   2. The deadline must be in the future — a past deadline would otherwise
 *      render "00:00:00" for one tick before the client component hides
 *      itself. This server-side gate prevents the flash entirely.
 *
 * Returns the raw ISO string (trusted by the client component) or null.
 */
function resolveCountdownTarget(): string | null {
	if (!LAUNCH_PRICING_ENDS_AT) return null;

	const parsed = Date.parse(LAUNCH_PRICING_ENDS_AT);
	if (!Number.isFinite(parsed) || parsed <= Date.now()) return null;

	return LAUNCH_PRICING_ENDS_AT;
}

/**
 * Pricing Page
 *
 * Server Component — public-facing subscription pricing surface.
 *
 * Data flow:
 *   1. Resolve the session cookie (local decode — cheap). Decides whether
 *      we're going to bother fetching the user's subscription.
 *   2. Parallel fetch: plans list + my-subscription (authenticated only).
 *      Plans are the critical blocking data; my-subscription failure
 *      degrades silently to the non-subscriber experience.
 *   3. Failure: render the same error card used on /browse so users bounce
 *      back into the main flow with one click.
 *   4. Success: sort plans by `metadata.sortOrder` ascending (belt-and-
 *      suspenders — backend also orders). Render the success dialog (if
 *      returning from Stripe), hero, card grid with current-plan
 *      highlighting, countdown (env-gated), and FAQ.
 *
 * Caching: default RSC behavior. The underlying `getPlans` call hits a
 * public endpoint whose payload rarely changes; if this becomes a hot path,
 * wrap `getPlans` in `unstable_cache` with a 5-minute revalidation window
 * — not done now because the /pricing traffic pattern doesn't justify it.
 */
export default async function PricingPage() {
	// Step 1: Resolve the cookie-backed session first — it's a local decode,
	// strictly faster than any network call, and its result decides whether
	// we bother fetching the user's subscription at all. Running it sequentially
	// costs nothing measurable and avoids an unnecessary `/subscriptions/me`
	// request for guests (which would 401 and be discarded).
	const session = await getSession();
	const isAuthenticated = !!session;

	// Step 2: Parallel network work — plans are public; my-subscription is
	// only meaningful for authenticated viewers. Passing `Promise.resolve`
	// for the guest path keeps the tuple destructure clean without a second
	// async branch.
	const [plansResult, currentSubResult] = await Promise.all([
		getPlans(),
		isAuthenticated ? getMySubscription() : Promise.resolve(null),
	]);

	// Step 3: Extract the current subscription, tolerating failures. A
	// transient `/subscriptions/me` outage should degrade to "no current
	// plan highlight" rather than take down the pricing page — the service
	// already captured the error to Sentry on the failure path.
	const currentSubscription =
		currentSubResult && currentSubResult.success ? currentSubResult.data : null;

	// Step 4: Failure branch — mirror /browse's bug-icon error card so the
	// error surface feels consistent across public pages.
	if (!plansResult.success) {
		return (
			<div className="flex h-[50vh] w-full flex-col items-center justify-center gap-10 text-center">
				<BugIcon />
				<hgroup className="space-y-4">
					<h1 className="text-xl font-semibold">Unable to load pricing</h1>
					<p className="mt-2 text-lg">
						Something went wrong on our end. Please try again in a moment.
					</p>
				</hgroup>
				<Link
					href="/browse"
					className="focus-visible:ring-ring/50 inline-flex items-center justify-center rounded-full border border-black bg-white px-12 py-3 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white focus-visible:ring-[3px] focus-visible:outline-none"
				>
					Back to Sweepstakes Browse
				</Link>
			</div>
		);
	}

	// Step 5: Stable display order. Backend already returns plans ordered by
	// price ascending, but `metadata.sortOrder` is the FE-authoritative key —
	// Ops can pin a plan to a position without changing its price. `toSorted`
	// keeps the original array immutable (project style rule).
	const plans = plansResult.data.plans.toSorted(
		(a, b) => a.metadata.sortOrder - b.metadata.sortOrder,
	);

	const countdownEndsAt = resolveCountdownTarget();
	const currentPlanId = currentSubscription?.planId ?? null;

	return (
		<div className="mx-auto flex w-full max-w-[1016px] flex-col gap-10 px-4 py-8 sm:gap-14 sm:py-12">
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
					className="focus-visible:ring-ring/50 sm:text-h4 inline-flex items-center gap-2 rounded-sm text-lg font-semibold text-black underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
				>
					<ArrowLeft className="size-6" aria-hidden />
					Back to Sweepstakes Browse
				</Link>
			</div>

			{/* Hero — typography mirrors `browse/hero-section.tsx` (Clash Display
			    semibold, fluid-ish sizing, tight leading, subtle tracking) so the
			    two hero surfaces feel authored by the same hand. */}
			<section className="flex flex-col items-center gap-6 text-center">
				{/* Eyebrow tagline — Geist Medium on the foreground color. Figma dropped
				    the earlier emerald accent so the headline isn't pre-announced in a
				    loud color; the eyebrow now reads as quiet supporting copy. "Enhanced
				    odds" and "Risk-Free" were removed from the prior revision: both
				    phrases, in a sweepstakes context, read as claims that paid entrants
				    are advantaged over AMOE entrants. Compliance requires identical odds
				    across paid and free paths — see /free-entry. */}
				<p className="text-foreground text-base leading-[1.4] font-medium">
					Gain access to member benefits across every sweepstakes. Subscribe now
					to unlock bigger discounts and bonus entries.
				</p>
				{/* No trailing period after "Win" — the design treats the three
				    words as a staccato triplet; a terminal period would kill the
				    rhythm and make the headline feel like a full sentence. */}
				<h1 className="font-clash-display sm:text-h3-featured text-4xl leading-none font-semibold">
					Subscribe Today. Save. Win
				</h1>
				<p className="text-foreground max-w-[854px] text-base leading-[1.4] font-normal text-balance">
					Rafli is LIVE. Subscribe now to lock in exclusive member discounts and
					bonus entries across hundreds of new sweepstakes every month. Become a
					founding member of this community NOW.
				</p>
				<ul className="flex flex-wrap items-center justify-center gap-4">
					{HERO_STATS.map(stat => (
						<li
							// `bold`+`suffix` composite is a stable natural key — the list is
							// module-scoped and never reorders.
							key={stat.bold}
							className="bg-background inline-flex items-center gap-1 rounded-full border border-black px-3 py-0.5 text-sm"
						>
							{/* Solid mint dot (`#13e36f`) replaces the earlier check glyph.
							    Figma's stat pills read as "live counter" signals, not claim
							    checkmarks, so the smaller unadorned dot is more honest. */}
							<span
								aria-hidden
								className="size-2 shrink-0 rounded-full bg-[#13e36f]"
							/>
							<span className="text-foreground font-semibold">{stat.bold}</span>
							<span className="text-foreground font-normal">{stat.suffix}</span>
						</li>
					))}
				</ul>
			</section>

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
				className="grid gap-6 sm:grid-cols-2 sm:gap-8"
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
			{countdownEndsAt ? <LaunchCountdown endsAt={countdownEndsAt} /> : null}

			<PricingFaq />
		</div>
	);
}
