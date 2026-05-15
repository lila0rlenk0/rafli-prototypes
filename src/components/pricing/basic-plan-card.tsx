import { Check } from 'lucide-react';
import Link from 'next/link';

import { pickSubscribeProvider } from '@/components/pricing/subscribe/pick-subscribe-provider';
import { SubscribeButton } from '@/components/pricing/subscribe/subscribe-button';
import { cn } from '@/lib/class-names';
import {
	type MySubscription,
	type SubscriptionPlan,
	type SubscriptionProvider,
} from '@/types/subscription';

import { formatPrice } from './format-price';

/**
 * Subscribe CTA slot for the Basic card. Mirrors `PlanCard`'s `SubscribeSlot`
 * — resolves the rail via `pickSubscribeProvider` and renders an informational
 * pill when the plan is not offered on the viewer's locked rail. Kept symmetric
 * across the two card surfaces so the unavailable branch reads identically.
 *
 * @returns Subscribe CTA targeting the resolved provider, or a "not on your
 *   billing provider" pill when the plan + lock don't intersect.
 */
function BasicSubscribeSlot(options: {
	plan: SubscriptionPlan;
	isAuthenticated: boolean;
	lockedProvider: SubscriptionProvider | null;
}) {
	const { plan, isAuthenticated, lockedProvider } = options;
	const provider = pickSubscribeProvider({
		availableProviders: plan.availableProviders,
		lockedProvider,
	});
	if (provider === null) {
		// Match the surrounding card's pill radius (`rounded-full`) — the upper
		// `PlanCard` uses `rounded-md` because its CTA is the shadcn default; the
		// Basic card uses the outline pill aesthetic, so its unavailable state
		// matches that shape instead of fighting the card chrome.
		return (
			<div className="border-input bg-muted text-foreground inline-flex h-12 w-full items-center justify-center rounded-full border text-sm font-medium">
				Not on your billing provider
			</div>
		);
	}
	return (
		<SubscribeButton
			planId={plan.id}
			provider={provider}
			label={`Get ${plan.name}`}
			isAuthenticated={isAuthenticated}
			variant="secondary"
		/>
	);
}

/**
 * Current-plan callout for the Basic card — static "Your current plan" pill
 * + "Manage from profile" deflect link. Mirrors `PlanCard`'s
 * `CurrentPlanCallout` but uses the basic-tier's outline-pill aesthetic
 * (`rounded-full` instead of `rounded-md`). Extracted for `no-nested-ternary`.
 */
function BasicCurrentPlanCallout() {
	return (
		<div className="flex flex-col gap-3">
			<div className="border-green-vivid inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 bg-white text-sm font-semibold text-black">
				<Check
					aria-hidden
					className="text-green-vivid size-4"
					strokeWidth={3}
				/>
				Your current plan
			</div>
			<Link
				href="/profile#subscription"
				className="text-foreground focus-visible:ring-ring/50 mx-auto inline-flex items-center gap-2 rounded-sm text-sm font-medium underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3"
			>
				Manage from profile
			</Link>
		</div>
	);
}

/**
 * Deflect link for the Basic card — subscribed-but-different-plan visitors
 * route here instead of seeing a no-op subscribe CTA. Same pattern as the
 * upper grid, with the basic card's pill aesthetic (`rounded-full`).
 */
function BasicManageFromProfileLink() {
	return (
		<Link
			href="/profile#subscription"
			className="border-input bg-muted text-foreground hover:bg-foreground hover:text-background focus-visible:ring-ring/50 inline-flex h-12 w-full items-center justify-center rounded-full border text-sm font-semibold transition-colors outline-none focus-visible:ring-3"
		>
			Manage from profile
		</Link>
	);
}

/**
 * Resolves the Basic card's CTA slot without nested ternaries. Precedence
 * mirrors `PlanCard`'s `PlanCardCTA`: current → deflect → subscribe.
 */
function BasicCardCTA(options: {
	plan: SubscriptionPlan;
	isAuthenticated: boolean;
	isCurrent: boolean;
	hasOtherActiveSubscription: boolean;
	lockedProvider: SubscriptionProvider | null;
}) {
	const {
		plan,
		isAuthenticated,
		isCurrent,
		hasOtherActiveSubscription,
		lockedProvider,
	} = options;
	if (isCurrent) return <BasicCurrentPlanCallout />;
	if (hasOtherActiveSubscription) return <BasicManageFromProfileLink />;
	return (
		<BasicSubscribeSlot
			plan={plan}
			isAuthenticated={isAuthenticated}
			lockedProvider={lockedProvider}
		/>
	);
}

interface BasicPlanCardProps {
	plan: SubscriptionPlan;
	/** Drives whether the subscribe CTA fires the action or deflects to sign-in. */
	isAuthenticated: boolean;
	/**
	 * `true` when this plan matches the viewer's active subscription. Mirrors
	 * the equivalent flag on `PlanCard` so a Basic-tier subscriber sees the
	 * "your current plan" affordance + manage link instead of the subscribe
	 * CTA — kept symmetric with `PlanCard` rather than diverging the API.
	 */
	isCurrent?: boolean;
	/**
	 * Active subscription owned by the viewer. When non-null and `isCurrent`
	 * is false, the CTA is replaced with a "Manage from profile" deflect link
	 * — pricing handles acquisition only since the IA split, so any subscribed
	 * visitor on a non-current card is sent to `/profile#subscription`.
	 */
	currentSubscription?: MySubscription | null;
	/**
	 * Provider rail the subscribe CTA should target. Threaded from the
	 * pricing page's `lockedProvider` so a returning subscriber stays on the
	 * rail their billing history already lives on. Null on first-time buyers;
	 * the Stripe default is applied at render time so the CTA always has a
	 * concrete value to forward to `<SubscribeButton>`.
	 */
	lockedProvider: SubscriptionProvider | null;
}

/**
 * Tagline split. Backend ships the Basic tagline as a single string and we
 * intentionally don't ask Ops to author it as two fields — instead we lift
 * every sentence except the final "Pay $X in credits, get $Y in value …"
 * recap to bold via a sentence-boundary split. The bold portion carries the
 * marketing punches ("Save 10% on every deal. No Risk. Cancel Anytime.") and
 * the medium remainder is the longer value recap that closes the card copy.
 *
 * The split is best-effort: if the tagline contains no internal sentence
 * boundary (single sentence, or punctuation only at the very end) we render
 * the whole thing in medium weight rather than fabricating emphasis. Returning
 * a tuple keeps the JSX flat (no inline ternary on a string operation).
 *
 * @param tagline - Plan-level tagline string from the backend metadata blob.
 * @returns `lead` (bold sentences before the final one) + `rest` (medium
 *   remainder). `lead` may be empty when the tagline has no internal split.
 */
function splitTagline(tagline: string): { lead: string; rest: string } {
	const trimmed = tagline.trim();
	// Greedy `.+` walks back from the end-of-string to the LAST sentence
	// terminator (`.`, `!`, `?`) followed by whitespace, so the lead captures
	// every sentence except the final one. Decimal figures like "$10.5" don't
	// confuse the split because they lack the trailing whitespace the regex
	// requires. A tagline with no internal boundary (e.g. "Hello world.") falls
	// through to the empty-lead branch — no fabricated emphasis.
	const match = /^(.+[.!?])\s+(.+)$/s.exec(trimmed);
	if (!match) return { lead: '', rest: trimmed };
	return { lead: match[1], rest: match[2] };
}

interface FeatureRowProps {
	text: string;
}

/**
 * Single feature bullet for the Basic card. Visual treatment differs from
 * `PlanCard`'s feature list: the Basic card sits below the two emphasised
 * tiers and reads as a quieter alternative, so we use a hairline-bordered
 * check tile (no coloured fill) instead of the silver/sky tiles. Keeps the
 * row weight closer to body copy than to the headline tiers above.
 *
 * Extracted into its own component because the card already has two columns
 * of content; inlining the feature row JSX would push the parent past the
 * project's max-lines-per-function ESLint cap.
 *
 * @param text - Feature copy from the backend metadata blob.
 * @returns Flex row with a check-icon tile and feature copy.
 */
function FeatureRow({ text }: FeatureRowProps) {
	return (
		<li className="flex items-start gap-4">
			<span className="border-input flex size-6 shrink-0 items-center justify-center rounded-lg border">
				<Check
					aria-hidden
					className="text-foreground size-3.5"
					strokeWidth={2.5}
				/>
			</span>
			<span className="text-foreground text-sm/dense font-normal">{text}</span>
		</li>
	);
}

/**
 * Basic-tier subscription card — horizontal layout reserved for the
 * smallest-price plan. Surfaces beneath the two emphasised tiers behind a
 * "Want to start smaller?" collapsible (see `BasicPlanCollapsible`) so the
 * grid above stays focused on the value tiers Ops wants to push.
 *
 * Visual contract per Figma:
 * - White surface, 24px radius, hairline `border-input` (no sticker, no header
 *   pill, no highlighted treatments — those signal "pick this one" and we
 *   deliberately don't apply them to the de-emphasised tier).
 * - Two-column flow on `lg+` (price + tagline | features + CTA), stacking on
 *   smaller breakpoints so the right column doesn't get squeezed.
 * - CTA flows through `SubscribeButton` so checkout state, sign-in deflection,
 *   and the brand hover flip stay shared with the main grid.
 *
 * Server Component. The interactive subtree (SubscribeButton /
 * ManageSubscriptionButton) is the only client boundary.
 *
 * @param plan - Plan entity from `GET /subscriptions/plans`.
 * @param isAuthenticated - Whether the viewer has an active session.
 * @param isCurrent - Whether this plan matches the viewer's subscription.
 * @returns Horizontal white card with price block, feature list, and CTA.
 */
export function BasicPlanCard({
	plan,
	isAuthenticated,
	isCurrent = false,
	currentSubscription = null,
	lockedProvider,
}: BasicPlanCardProps) {
	const tagline = splitTagline(plan.metadata.tagline);
	// Deflect-to-profile gate mirrors `PlanCard` — subscribed users on a
	// non-current card route to the profile management surface instead of
	// firing a subscribe CTA the BE would reject as `already-subscribed`.
	const hasOtherActiveSubscription = !isCurrent && currentSubscription !== null;

	return (
		<article
			aria-labelledby={`basic-plan-${plan.id}-name`}
			// Same `aria-current` rule as `PlanCard` — a subscriber on this tier
			// hears "current, Basic" when they enter the article landmark.
			aria-current={isCurrent ? 'true' : undefined}
			className={cn(
				'border-input flex flex-col gap-8 self-stretch overflow-hidden rounded-3xl border bg-white p-6 text-black sm:p-10 lg:p-14',
				// Subtle current-plan affordance that doesn't fight the de-emphasised
				// design — switch the border to the green vivid stroke without the
				// tinted surface used in `PlanCard`. The Basic card is deliberately
				// quieter than the upper grid; a full mint wash here would over-
				// signal a tier the page is already de-emphasising.
				isCurrent && 'border-green-vivid border-2',
			)}
		>
			<div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
				{/* Left column — name, price, tagline. `max-w-md` caps the tagline
				    line length so it doesn't run edge-to-edge on wide viewports
				    where the right column collapses to its intrinsic width. */}
				<div className="flex flex-col gap-6 lg:max-w-md lg:shrink-0">
					<div className="flex flex-col gap-4">
						<h3
							id={`basic-plan-${plan.id}-name`}
							className="font-clash-display tracking-micro text-2xl/tight font-semibold"
						>
							{plan.name}
						</h3>
						{/* aria-label replaces the visible " / month" so screen readers
						    hear "$10 per month" rather than "$10 slash month". Keeps
						    the headline glyph + suffix vertically baseline-aligned the
						    same way `PlanCard` does for visual consistency. */}
						<p
							className="flex items-baseline gap-1"
							aria-label={`${formatPrice(plan.monthlyPriceAmount)} per month`}
						>
							<span
								aria-hidden
								className="font-clash-display text-5xl/none font-semibold"
							>
								{formatPrice(plan.monthlyPriceAmount)}
							</span>
							<span
								aria-hidden
								className="text-foreground text-base/relaxed font-normal"
							>
								/ month
							</span>
						</p>
					</div>
					{/* Tagline split: bold lead sentence (the value prop) + medium
					    remainder. When the backend ships a tagline without a sentence
					    boundary, the lead string is empty and the whole tagline
					    renders in medium weight — no fabricated emphasis. */}
					<p className="text-base/relaxed text-pretty whitespace-pre-line text-black">
						{tagline.lead ? (
							<span className="font-bold">{tagline.lead} </span>
						) : null}
						<span className="font-medium">{tagline.rest}</span>
					</p>
				</div>

				{/* Right column — features + CTA. `lg:flex-1` lets the column claim
				    remaining horizontal space on wide viewports without overflowing
				    the card's max width. */}
				<div className="flex flex-col gap-6 lg:flex-1">
					<ul className="flex flex-col gap-6">
						{plan.metadata.features.map(feature => (
							<FeatureRow key={feature.text} text={feature.text} />
						))}
					</ul>

					{/* CTA mirrors `PlanCard`. Current-plan: static pill + a
					    "Manage from profile" deflect link. Subscribed-but-on-
					    a-different-plan: replace the subscribe CTA with the
					    same deflect link. Anyone else (guest / churned /
					    first-time buyer): subscribe CTA renders normally. */}
					<BasicCardCTA
						plan={plan}
						isAuthenticated={isAuthenticated}
						isCurrent={isCurrent}
						hasOtherActiveSubscription={hasOtherActiveSubscription}
						lockedProvider={lockedProvider}
					/>
				</div>
			</div>
		</article>
	);
}
