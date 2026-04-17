import Link from 'next/link';

// Both headline lines share identical typography so the "hook" ("20% OFF")
// carries the same visual weight as the verb ("Subscribe Now"). Extracted
// to module scope because (a) the string is reused across h2/p — inline
// duplication would drift, and (b) it's static, so allocating it per render
// would be wasted work.
//
// NO `text-balance` here. text-balance re-flows multi-line elements to
// equalize line widths — which is exactly WRONG for this card: if the
// headline almost-but-not-quite fits, balance prefers to split it into
// two near-equal lines ("Subscribe" / "Now. Save. Win.") instead of
// keeping it on one line. We want one-line-or-nothing, so sizes are
// picked conservatively enough that natural wrapping never fires.
//
// Size ladder (paired with card padding in the <aside> className below):
//   - base `text-[26px]` — mobile, card ~px-6, internal ~280–460px. Fits
//     the longer line "Up To 20% OFF on tickets!" (~25 chars) comfortably.
//   - `sm:text-[30px]` — tablet onward gains breathing room (sm:px-10),
//     internal ~420–480px. Both lines fit, headline reads larger.
//   - `lg:text-[28px]` — card becomes the right rail (440–540px column,
//     lg:px-6 → ~392–492px internal). 28px keeps "Subscribe Now. Save.
//     Win." on one line at the rail's lower bound (440px).
//   - `xl:text-[30px]` — restores presence once the rail widens past 480px,
//     where 28px starts to feel undersized relative to the hero headline.
const HEADLINE_CLASSES =
	'font-clash-display text-[26px] leading-[1.05] font-semibold tracking-[-0.01em] sm:text-[30px] lg:text-[28px]';

interface SubscribePromoCardProps {
	/**
	 * Whether the viewer is already enrolled in any plan. When true, the card
	 * suppresses itself — existing subscribers have no use for the "Subscribe
	 * Now" upsell and would otherwise bounce into /pricing only to hit an
	 * `ALREADY_SUBSCRIBED` toast. Parent is expected to fetch this once (via
	 * the page-level `getMySubscription()` call) and cascade it here.
	 *
	 * Defaults to `false` so guest-only surfaces (which never fetch
	 * subscription state) keep rendering the card without extra wiring.
	 */
	readonly hasSubscription?: boolean;
}

/**
 * Browse-page promo CTA that funnels visitors into the subscription pricing
 * surface. Rendered beside the hero stats so it catches the first scroll
 * impression — same vertical rhythm as the headline, distinct yellow accent
 * so it reads as a side panel rather than an inline banner.
 *
 * Hides entirely for already-subscribed viewers: parent `BrowseRafflesPage`
 * fetches `getMySubscription()` in the same parallel block as the raffle
 * data, and passes `hasSubscription` through. The subscription-gated render
 * returns `null` before any DOM is emitted so there's zero byte cost for
 * enrolled users.
 *
 * Server Component — static JSX only. Hydration would cost bytes for zero
 * interactivity. The `Link` inherits Next.js prefetch behavior automatically,
 * so the /pricing bundle is warm by the time the user clicks through.
 *
 * @returns Yellow aside with two-line promo headline and pill CTA to /pricing,
 *   or `null` when the viewer already has an active subscription.
 */
export function SubscribePromoCard({
	hasSubscription = false,
}: SubscribePromoCardProps = {}) {
	// Business rule: existing subscribers never see the upsell. Short-circuit
	// before any JSX so the surrounding layout gap (owned by the parent grid)
	// is the only thing left behind, not an empty aside.
	if (hasSubscription) return null;

	return (
		<aside
			aria-labelledby="subscribe-promo-heading"
			// On `lg:` the card visually continues out of the yellow marquee
			// banner that sits above the page content:
			//   - `lg:-mt-10` cancels the page wrapper's `sm:mt-10` gap so the
			//     card's top edge sits flush with the marquee's bottom border.
			//     Below lg we keep the natural gap because the marquee is full
			//     width and the card stacks under the hero, so "continuation"
			//     doesn't apply spatially.
			//   - `lg:rounded-t-none` squares the top corners so the card
			//     reads as an extrusion of the banner, not a separate tile
			//     floating against it.
			//   - `lg:border-t-0` drops the card's top stroke — the marquee's
			//     own `border-b border-black` becomes the shared horizontal
			//     rule between the two surfaces. Leaving both in place would
			//     render a 2px-thick double line that looks like a bug.
			// Below lg the card renders as a fully-rounded yellow panel
			// stacked under the hero, and all three overrides no-op.
			className="bg-accent-yellow relative mx-auto flex w-full max-w-[520px] flex-col items-center justify-center gap-5 rounded-[28px] border border-black px-2 py-8 text-center sm:gap-6 sm:rounded-3xl sm:px-3 sm:py-10 lg:mx-0 lg:-mt-10 lg:max-w-none lg:gap-5 lg:rounded-t-none lg:border-t-0 lg:px-3 lg:py-8"
		>
			{/* `gap-0.5` (2px) pulls the two headline lines into a single
			    typographic block rather than reading as two separate lines.
			    `max-w` caps the hgroup so an accidental long copy edit doesn't
			    stretch text into ugly wide lines on xl viewports; the card
			    itself is still centered via the flex parent. */}
			<hgroup className="flex w-full flex-col gap-1">
				<h2 id="subscribe-promo-heading" className={HEADLINE_CLASSES}>
					Subscribe Now. Save. Win.
				</h2>
				<p className={HEADLINE_CLASSES}>Up To 20% OFF on tickets!</p>
			</hgroup>
			{/* Pill CTA is the only interactive surface on the card. Deliberately
			    NOT wrapping the whole `<aside>` in a Link because:
			      1. a card-sized Link swallows accidental stray taps on touch
			         devices (entire yellow surface becomes tappable)
			      2. it breaks text selection on the headline copy
			      3. it confuses screen readers that announce the full card as
			         a single "Subscribe Now Save Win Up To 20%..." link label
			    Width tuned to nearly match the headline line length so the pill
			    reads as a continuation of the typographic block rather than a
			    small satellite button. `w-[min(100%,22rem)]` on mobile caps at
			    352px to keep the button finger-reachable on touch; at lg the
			    pill grows to `max-w-[24rem]` (~384px) which visually tracks the
			    ~400px "Subscribe Now. Save. Win." at 28px Clash Display semibold.
			    Height: 44px (iOS min touch target) → 48px sm → 52px lg. */}
			<Link
				href="/pricing"
				className="focus-visible:ring-ring/50 inline-flex h-11 w-full max-w-[22rem] items-center justify-center rounded-full bg-black px-8 text-sm font-semibold text-white transition-colors hover:bg-black/90 focus-visible:ring-[3px] focus-visible:outline-none sm:h-12 sm:text-base lg:h-[52px] lg:max-w-[24rem]"
			>
				Get Credits!
			</Link>
		</aside>
	);
}
