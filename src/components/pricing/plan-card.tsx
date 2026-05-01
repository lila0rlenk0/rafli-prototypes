import { Check } from 'lucide-react';

import { cn } from '@/lib/class-names';
import type { SubscriptionPlan } from '@/types/subscription';

import { formatPrice } from './format-price';
import { ManageSubscriptionButton } from '@/components/pricing/subscribe/manage-subscription-button';
import { SubscribeButton } from '@/components/pricing/subscribe/subscribe-button';

interface PlanCardProps {
	plan: SubscriptionPlan;
	/** Drives whether the subscribe CTA is enabled or deflects to sign-in. */
	isAuthenticated: boolean;
	/**
	 * `true` when this plan matches the viewer's active subscription. Swaps
	 * the card's surface, border, and CTA into a "you're on this plan" state
	 * so subscribers see their current tier at a glance instead of re-reading
	 * the grid like a purchase page.
	 *
	 * Kept as a boolean (not a status enum) because the pricing page only
	 * needs to answer "is THIS card the current plan?" — whatever the user's
	 * actual status is (active, cancelled, past_due), the card treatment is
	 * identical; the nuance belongs on the profile management page, not here.
	 */
	isCurrent?: boolean;
}

/**
 * Feature-tag pill class string. Both plan cards in the Figma reference
 * render every tag (`NEW`, `LIMITED OFFER`, `Only PROs`) with the same mint
 * surface + dark-mint foreground — the design uses tag *colour* as a
 * "this is a perk" signal across plans and reserves the per-plan hue for
 * the check-icon tile (themed via `checkClasses`). Hoisted as a module
 * constant so the JSX stays free of per-render allocation.
 */
const TAG_CLASSES = 'bg-brand-mint text-accent-green-foreground';

/**
 * Check-icon tile palette, themed by the plan's highlight status. Figma
 * mirrors the card's accent in the tile that holds the check glyph:
 * - Starter (default): silver tile + ink-700 glyph — quiet, monochrome.
 * - Pro (highlighted): sky tile + brand-teal glyph — reinforces the same
 *   sky/teal accent the "BEST VALUE" header pill uses, so the entire
 *   featured card reads as one colour story.
 *
 * Returned as a `tile` + `glyph` tuple because Tailwind needs the foreground
 * colour on the icon element, not the wrapping span — splitting the strings
 * keeps the JSX flat.
 *
 * @param isHighlighted - Whether the plan is the featured tier (Pro today).
 * @returns `tile` + `glyph` Tailwind classes for the check-icon pair.
 */
function checkClasses(options: { isHighlighted: boolean }): {
	tile: string;
	glyph: string;
} {
	const { isHighlighted } = options;
	if (isHighlighted) {
		return { tile: 'bg-sky-200', glyph: 'text-brand-teal' };
	}
	return { tile: 'bg-silver', glyph: 'text-ink-700' };
}

/**
 * Border + surface classes for the card shell. Three mutually exclusive
 * treatments — extracted from an inline branch so the class string isn't a
 * nested ternary (project style rule forbids those) and so the three cases
 * stay side-by-side where their visual semantics are easy to audit.
 *
 * `isCurrent` wins over `isHighlighted`: once a user is enrolled, the
 * "this is your plan" read is higher-signal than "this is the best plan",
 * so the green treatment takes over even on the featured card.
 *
 * @param isCurrent - Viewer is subscribed to this plan.
 * @param isHighlighted - Plan is the featured tier (Pro today).
 * @returns Tailwind classes for the article's border + surface wash.
 */
function shellClasses(options: {
	isCurrent: boolean;
	isHighlighted: boolean;
}): string {
	const { isCurrent, isHighlighted } = options;
	// Current plan — solid green border + 25% mint wash so the "yours" read
	// is immediate without hunting for a pill. Wash kept at 25% so the body
	// typography still passes AA contrast against the tinted surface.
	if (isCurrent) {
		return 'border-2 border-green-vivid bg-brand-mint/25';
	}
	// Featured plan — solid black border on white to pull the eye without
	// changing the surface (keeps the yellow discount sticker + green
	// feature tags readable).
	if (isHighlighted) {
		return 'border-black';
	}
	// Default — quiet neutral hairline; card recedes next to the featured
	// sibling without disappearing.
	return 'border-input';
}

/**
 * Rotated "X% OFF" sticker overlapping the card's top-right corner.
 *
 * Extracted as its own component because PlanCard already brushes the
 * `max-lines-per-function` ESLint cap; pulling the sticker out keeps the
 * parent under 150 LOC without losing the inline comment density the
 * style guide expects on cosmetic decisions.
 *
 * Tier-aware palette: featured plan gets the brand-yellow surface + black
 * border for emphasis; the quieter plan gets a white pill with a hairline
 * gray border so it recedes alongside the card chrome. `aria-hidden`
 * because the discount percent is already surfaced in the feature list —
 * repeating it to assistive tech would be noise.
 *
 * @param text - Marketing label (e.g. "15% OFF").
 * @param isHighlighted - Whether the host plan is the featured tier.
 * @returns Absolutely-positioned rotated sticker pinned to the card's
 *   top-right corner across breakpoints.
 */
function DiscountSticker({
	text,
	isHighlighted,
}: {
	text: string;
	isHighlighted: boolean;
}) {
	return (
		<div
			aria-hidden
			className={cn(
				// Sticker sits flush with the card's right edge and cantilevers
				// ~28px above the top border on desktop. Pushing it past the
				// right edge (instead of insetting) is what sells the "stuck
				// on after the fact" effect — centered stickers read as
				// planned chrome and lose their urgency.
				'-rotate-tilt-sm pointer-events-none absolute -top-5 right-2 flex h-17.5 w-37.5 flex-col items-center justify-center rounded-3xl border sm:-top-7 sm:right-4 sm:h-21.25 sm:w-42.5',
				isHighlighted
					? 'bg-brand-yellow border-black'
					: 'border-ink-300 bg-white',
			)}
		>
			<span className="font-clash-display text-xl/none font-semibold text-black sm:text-2xl">
				{text}
			</span>
			<span className="mt-1 text-xs font-semibold text-black sm:text-sm">
				on every entry
			</span>
		</div>
	);
}

/**
 * Resolves which header pill to render next to the plan name, if any.
 * Extracted to keep the JSX free of nested ternaries (style rule) and to
 * make the precedence explicit: a subscribed user's "CURRENT" marker beats
 * the generic "BEST VALUE" upsell — once you're enrolled, the upsell is
 * noise. Non-subscribers on the featured plan still see the label.
 *
 * @param isCurrent - Viewer is subscribed to this plan.
 * @param highlightLabel - Plan's marketing label (may be null).
 * @returns `'current'` | `'highlight'` | `null`.
 */
function resolveHeaderPill(options: {
	isCurrent: boolean;
	highlightLabel: string | null;
}): 'current' | 'highlight' | null {
	const { isCurrent, highlightLabel } = options;
	if (isCurrent) return 'current';
	if (highlightLabel) return 'highlight';
	return null;
}

/**
 * Single plan card — renders price, tagline, feature list, and the CTA
 * that kicks off Stripe Checkout.
 *
 * Both cards share the same white surface: the design uses the CTA treatment
 * (filled vs outline) + the optional "BEST VALUE" pill as the signal for the
 * featured plan, NOT an inverted color scheme. An inverted dark card would
 * fight the yellow discount badge and the green feature checks for attention.
 *
 * Server Component. The interactive subtree (SubscribeButton) is the only
 * client boundary; the rest streams as static HTML for faster paint.
 *
 * @param plan - Plan entity returned by `GET /subscriptions/plans`
 * @param isAuthenticated - Whether the viewer has an active session
 * @returns White-surface article with header, feature list, and CTA
 */
export function PlanCard({
	plan,
	isAuthenticated,
	isCurrent = false,
}: PlanCardProps) {
	const highlighted = plan.metadata.isHighlighted;
	const headerPill = resolveHeaderPill({
		isCurrent,
		highlightLabel: plan.metadata.highlightLabel,
	});
	const check = checkClasses({ isHighlighted: highlighted });

	return (
		<article
			// Role + heading landmark so assistive tech reads "article, Starter" etc.
			aria-labelledby={`plan-${plan.id}-name`}
			// Business rule: current plan overrides the usual highlight treatment.
			// The current-plan read always wins — a subscriber needs to recognise
			// their plan whether it's the featured tier or not, so the mint surface
			// + green border get top priority regardless of `isHighlighted`.
			aria-current={isCurrent ? 'true' : undefined}
			className={cn(
				'relative flex flex-col gap-6 rounded-3xl border bg-white p-6 text-black sm:gap-10 sm:p-10',
				shellClasses({ isCurrent, isHighlighted: highlighted }),
			)}
		>
			{plan.metadata.badgeText ? (
				<DiscountSticker
					text={plan.metadata.badgeText}
					isHighlighted={highlighted}
				/>
			) : null}

			<header className="flex flex-col gap-4">
				{/* Plan name + "BEST VALUE" pill share a single baseline row. `gap-3`
				    (not `justify-between`) pins the pill next to the name rather than
				    punting it to the far right where it would collide with the rotated
				    discount sticker and read as two disconnected badges. */}
				<div className="flex flex-wrap items-center gap-3">
					<h3
						id={`plan-${plan.id}-name`}
						className="font-clash-display tracking-micro text-2xl/tight font-semibold"
					>
						{plan.name}
					</h3>
					{/* Precedence (enrolled → "CURRENT"; featured non-subscriber →
					    "BEST VALUE") resolved in `resolveHeaderPill` to keep
					    the JSX flat. Mint = "yours", sky = upsell. */}
					{headerPill === 'current' ? (
						<span className="bg-brand-mint text-mini tracking-micro-5 text-green-forest inline-flex items-center rounded-lg px-3 py-1 font-semibold uppercase">
							Current
						</span>
					) : null}
					{headerPill === 'highlight' ? (
						<span className="bg-brand-sky text-mini tracking-micro-5 text-brand-teal inline-flex items-center rounded-lg px-3 py-1 font-semibold uppercase">
							{plan.metadata.highlightLabel}
						</span>
					) : null}
				</div>
				{/* aria-label replaces the visible baseline "/ month" so SR users
				    hear "$25 per month" rather than "$25 slash month". `leading-none`
				    keeps the 48px glyph from inflating the row height; `baseline`
				    alignment pins the unit label to the digit baseline instead of
				    center-aligning it (which would look off with a large numeral). */}
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
					<span aria-hidden className="text-foreground text-base font-normal">
						/ month
					</span>
				</p>
				<p className="text-foreground text-label/dense font-normal whitespace-pre-line">
					{plan.metadata.tagline}
				</p>
			</header>

			<ul className="flex flex-col gap-6">
				{plan.metadata.features.map(feature => (
					<li
						// Feature text is the natural key — the backend guarantees features
						// within a plan are unique, and a stable-enough key saves React from
						// thrashing when plans refresh.
						key={feature.text}
						className="text-label flex items-start gap-4"
					>
						{/* Check-tile mirrors the card's accent (silver | sky) so
						    the Pro tile + glyph stay in lock-step with its
						    sky/teal "BEST VALUE" pill — see `checkClasses`. */}
						<span
							className={cn(
								'flex size-6 shrink-0 items-center justify-center rounded-lg',
								check.tile,
							)}
						>
							<Check
								aria-hidden
								className={cn('size-4', check.glyph)}
								strokeWidth={3}
							/>
						</span>
						<span className="flex flex-1 flex-wrap items-center gap-2 font-medium break-words text-black">
							<span>{feature.text}</span>
							{feature.tag ? (
								<span
									className={cn(
										'text-mini tracking-micro-5 inline-flex h-6.25 items-center rounded-lg px-3 font-semibold uppercase',
										TAG_CLASSES,
									)}
								>
									{feature.tag}
								</span>
							) : null}
						</span>
					</li>
				))}
			</ul>

			<div className="mt-auto">
				{isCurrent ? (
					// Current-plan affordance — disabled-looking pill + a separate
					// "Manage" link below. We intentionally don't render a disabled
					// <button> for the primary affordance because a disabled button
					// in a CTA slot reads as a form validation failure; a static
					// pill + secondary link says "you're here, here's what to do
					// instead" without miscommunicating state.
					<div className="flex flex-col gap-3">
						<div
							// Non-interactive pill (deliberately not a disabled `<Button>`
							// — disabled in a CTA slot reads as a form validation failure).
							// No ARIA on the pill itself: the parent `<article>` already
							// carries `aria-current="true"` + `aria-labelledby` pointing at
							// the plan name, so AT users hear "current, [plan name]" when
							// they enter the article. Adding `role="status"` here would
							// create a redundant live region for static state.
							className="border-green-vivid inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 bg-white text-sm font-semibold text-black"
						>
							<Check
								aria-hidden
								className="text-green-vivid size-4"
								strokeWidth={3}
							/>
							Your current plan
						</div>
						{/* Stripe-hosted Customer Portal — server action mints a
						    short-lived URL, the client redirects. Stripe owns the
						    cancel / plan-switch / payment-method / invoice UX so we
						    stay out of PCI scope and inherit feature parity for free.
						    Returning to `/pricing` (set server-side) re-renders the
						    current-plan card with the user's updated state. */}
						<ManageSubscriptionButton />
					</div>
				) : (
					<SubscribeButton
						planId={plan.id}
						label={`Get ${plan.name}`}
						isAuthenticated={isAuthenticated}
						// Highlighted plan gets the filled primary CTA to direct the eye;
						// non-highlighted plans use the outline variant as a quiet
						// secondary action.
						variant={highlighted ? 'primary' : 'secondary'}
					/>
				)}
			</div>
		</article>
	);
}
