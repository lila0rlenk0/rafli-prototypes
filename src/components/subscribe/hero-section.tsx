import { CreditPurchaseCard } from './credit-purchase-card';
import { HeroDecor } from './hero-decor';
import {
	CREDIT_CHARGE_USD,
	CREDIT_PAYOUT_USD,
	SUBSCRIBE_HERO_ANCHOR_ID,
} from './offer';

/**
 * Two-column subscribe hero: value-prop stack on the left, credit
 * purchase card on the right.
 *
 * The decorative `HeroDecor` slab sits behind the two-column row as
 * an absolute underlay (`-z-10`) bleeding off the section's top-left
 * corner. Translation + rotation live in the exported SVG paths;
 * screen placement is `hero-decor.tsx` (responsive `sm..xl` offsets) —
 * not duplicated here. The sticky nav (`z-20`) clips the top bleed.
 *
 * Headline is the two-beat Figma pitch: "Pay $10. Get $11 back." with
 * the rotated yellow `$11` pill anchored inline. Body copy is the
 * three-line value stack marketing signed off on — bold hook, savings
 * figure, risk-free closer.
 *
 * Navbar owns the Trustpilot badge, so the hero no longer re-renders
 * it — avoids double-stacking the trust signal.
 *
 * @returns Hero composing eyebrow, headline with $11 pill, body copy,
 *   stat pills, and the credit purchase card
 */
export function HeroSection() {
	return (
		<section
			id={SUBSCRIBE_HERO_ANCHOR_ID}
			// `isolate` opens an auto-z stacking context scoped to the
			// hero. The decor `HeroDecor` uses `-z-10` to tuck behind
			// the copy + credit card; without `isolate` that -10 would
			// bubble to the root stacking context and the bleed paths
			// would either eat past the nav's bg-background (if the
			// content wrapper shared the nav's z-index) or disappear
			// entirely beneath `main`'s opaque bg (if the wrapper had
			// no z-index). `isolate` confines the -10 to hero-only,
			// while leaving the whole hero at auto-z → nav (z=16)
			// always paints on top regardless of DOM order.
			// Row packing at `xl:` mirrors Figma's Information Section
			// composition: `inline-flex items-center gap-6`. Copy column
			// (710px) + 24px gap + credit card (492px) = 1226px total
			// row width, centered via `justify-center` in the 1344px
			// content area (`max-w-hero` 1440 minus 96px of
			// `--spacing-navbar-pad` gutters).
			// Previous `justify-between` stretched a ~140px gap between
			// copy and card at 1440 viewports — the reference keeps
			// the two columns tight at a 24px gap, which is what
			// anchors the rotated `$11` pill optically to the credit
			// card's mint header above it.
			className="relative isolate flex scroll-mt-20 flex-col items-start gap-10 pt-10 pb-12 xl:flex-row xl:items-center xl:justify-center xl:gap-6 xl:pt-14 xl:pb-16"
		>
			<HeroDecor />

			{/* Two-column layout activates at `xl:` (1280+), not `lg:` —
			    below 1280 the left column can't hold the H1 on one line
			    ("Pay $10. Get [$11 pill] back." ≈ 714px at 60px Clash
			    Display) alongside the 492-pixel credit card within the
			    `max-w-hero` (1440) shell minus the 96px navbar gutters.
			    Stacking is the honest fallback — the decor cluster +
			    marquee still carry the hero brand moment on their own.
			    At xl the copy caps at the Figma-exact 710px via
			    `--container-subscribe-hero-copy`. `flex-1` was dropped
			    because it let the copy grow past 710px and pushed the
			    credit card to the right edge; Figma keeps the row at
			    a fixed 710 + 24 + 492 = 1226 width, centered. */}
			<div className="relative flex w-full max-w-xl min-w-0 flex-col gap-4 md:max-w-2xl xl:w-(--container-subscribe-hero-copy) xl:max-w-none xl:shrink-0">
				{/* Uppercase eyebrow — Figma ref is 16px/24px Geist Medium
				    (`text-base font-medium leading-6`), NOT the 12px
				    label-sm the previous pass used. 12px made the eyebrow
				    disappear into the top of the hero and broke the
				    optical weight progression 16 (eyebrow) → 48/60 (H1)
				    → 18 (tagline) that Figma sets up. Ink is `text-ink-900`
				    (#121211) matching Figma's `var(--gray/1, #111)`. */}
				<p className="text-ink-900 text-base/6 font-medium uppercase">
					Gain access to the best deals.
				</p>

				{/* H1 — Clash Display 48→60px ladder. The 60px ceiling
				    waits for `xl:` (1280+) because that's when the 2-col
				    hero splits the page and the left column gets enough
				    horizontal space to fit "Pay $10. Get [$11 pill] back."
				    on one line (≈ 714px at 60px Clash Display). Below xl
				    the section stays flex-col so the 48px floor prevents
				    the H1 from wrapping a word per line when the column
				    cap sits at max-w-xl/2xl. `/tight` pairs 48/60px with
				    a 1.05 leading so the pill line never overlaps the
				    tagline. */}
				<h1 className="font-clash-display text-display-md/tight text-ink-900 xl:text-60/tight font-semibold">
					Pay ${CREDIT_CHARGE_USD}. Get <PriceBadge /> back.
				</h1>

				{/* Tagline — Figma ref is a single `<p>` with 2 spans + an
				    inline `<br/>` marking the forced wrap point:
				      Line 1: **Save 10% on every deal.** Over a $1000
				              in hacks every month.
				      Line 2: Free tickets. No Risk. Cancel Anytime.
				    Splitting into two `<p>` elements added a ~4px block
				    gap that Tailwind's preflight can't fully neutralise
				    on every breakpoint and drifted the tagline's second
				    line off-rhythm from the reference's 20px leading.
				    Size 18/20 at sm+ (`text-body-lg/5`), 16/20 below
				    (`text-body-md/5`). Ink `text-ink-alpha` matches
				    Figma's `rgba(15,15,15,0.95)`. */}
				<p className="text-body-md/5 text-ink-alpha sm:text-body-lg/5 max-w-xl">
					<span className="font-semibold">Save 10% on every deal.</span>{' '}
					<span className="font-normal">
						Over a $1000 in hacks every month.
						<br />
						Free tickets. No Risk. Cancel Anytime.
					</span>
				</p>

				{/* Stats row — Figma ref is `gap-4` (16px) with NO extra
				    top margin. The previous `mt-2 gap-3` pushed the row
				    24px below the tagline vs the 16px rhythm Figma uses
				    between every sibling in the main column. Now the
				    row sits on the same 16px gap-4 grid as eyebrow →
				    H1 → tagline, which is what the Main Container's
				    `gap-[16px]` composition declares in Figma. */}
				<div className="flex flex-wrap gap-4">
					<StatBadge value="$1,000,000+" label="in prizes distributed" />
					<StatBadge value="+100,000" label="active participants" />
				</div>
			</div>

			<CreditPurchaseCard />
		</section>
	);
}

/**
 * Inline rotated yellow pill rendering the credit payout figure.
 *
 * Figma spec: 110.37×63.29 pill, 48px Clash Display Semibold `$11`
 * inside — NOT inheriting the 60px H1 size. The smaller pill text
 * creates the intentional size contrast with "Pay $10." beside it,
 * and leaves ~76% fill ratio (48/63) so the digit breathes inside
 * the chip rather than pressing the border. Rotation: bg −15°,
 * text −16.06° (delta below perceptual threshold — one class works
 * for both). Ink `text-ink-alpha` (rgba 15,15,15,.95) matches
 * Figma exactly; `text-ink-900` (#121211) is the same apparent ink
 * but sits one step darker.
 *
 * @returns Absolutely-sized yellow rounded chip with centered $11
 *   text, both rotated counter-clockwise
 */
function PriceBadge() {
	// Pill dimensions and text size are both fixed (tokens + `text-5xl`
	// = 48px) to match Figma exactly. An earlier em-relative pass let
	// the pill scale with the H1's 60px size, which pushed the inner
	// text to 60px and crowded it against the pill edge (95% fill vs
	// Figma's 76%).
	//
	// Both the bg rectangle AND the text span are `absolute inset-0`
	// over the outer inline-block — so they occupy the exact same
	// box and `-rotate-tilt-sm` (−15°) pivots each around an
	// identical centre. An earlier variant used `relative inline-flex
	// size-full` on the text span, which in an inline context
	// doesn't properly fill the outer vertical bounds: the text's
	// line-box anchored to the outer's baseline instead of its
	// centre, rendering "$11" in the bottom-left quadrant of the
	// yellow pill. `absolute inset-0 flex items-center justify-center`
	// removes any baseline math — the flex axes centre the glyph
	// inside a known 110×63 box.
	//
	// Outer wrapper uses `align-middle` so the pill optically
	// centres with the surrounding 60px H1 glyphs rather than
	// sitting on their baseline (which pulled the pill down by
	// ~10px of descender space).
	return (
		<span className="relative mx-0.5 inline-block h-(--spacing-subscribe-pill-h) w-(--spacing-subscribe-pill-w) align-middle">
			<span className="bg-brand-yellow border-ink-900 -rotate-tilt-sm absolute inset-0 rounded-3xl border" />
			<span className="font-clash-display text-ink-alpha -rotate-tilt-sm absolute inset-0 flex items-center justify-center text-5xl/none font-semibold">
				${CREDIT_PAYOUT_USD}
			</span>
		</span>
	);
}

interface StatBadgeProps {
	readonly value: string;
	readonly label: string;
}

/**
 * Pill-shaped stat badge with a green dot + bold value + label.
 *
 * Figma spec: `px-3 py-0.5` (12/2px) — the 2px vertical inset is
 * deliberately flat, pulling the pill tight around the 14px ink so
 * the badge reads as a data chip rather than a body-copy card.
 * Previous `py-1` (4px) inflated the pill to 24px, breaking the
 * optical alignment with the H1 baseline above it.
 * 1px black hairline, rounded-full. `bg-green-vivid` (`#13e36f`)
 * sits ~1 hue-step from Figma's `#20DB78`; rather than introduce a
 * third vivid-green token, we ride the existing one — the dot
 * reads identically at 8px and the ink scale stays auditable.
 * Label ink is `text-ink-alpha` (rgba 15,15,15,.95) matching Figma
 * instead of `text-ink-900` (#121211, 1 step darker).
 */
function StatBadge({ value, label }: StatBadgeProps) {
	return (
		<div className="bg-background border-ink-900 flex items-center gap-1 rounded-full border px-3 py-0.5">
			<span className="bg-green-vivid inline-block size-2 shrink-0 rounded-full" />
			<p className="text-body-sm text-ink-alpha font-semibold">
				{value} <span className="font-normal">{label}</span>
			</p>
		</div>
	);
}
