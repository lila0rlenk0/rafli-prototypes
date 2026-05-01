/**
 * Three-color paper-cut decor cluster for the pricing hero.
 *
 * Three rotated rounded squares anchored to the page's top-left corner,
 * bleeding off the top edge so only their lower fringe reads inside the
 * page. Sizes, offsets, and rotations come straight from the Figma frame.
 *
 * Why `origin-top-left` is critical:
 *   The Figma source pivots every shape around its top-left corner
 *   (`origin-top-left rotate-[Ndeg]`). Tailwind's default rotation origin
 *   is the shape's center, which for a 540px square rotated 15° shifts
 *   the rendered position by ~70px diagonally — more than enough to slide
 *   the yellow front-of-stack out of frame and pull the mint slab down on
 *   top of the hero copy. Forcing `origin-top-left` makes the (top, left)
 *   coordinates we read off the Figma frame line up 1:1 with what the
 *   browser paints.
 *
 * Why anchored on `<main>` (not the hero section):
 *   `<main>` is the layout root that wraps the navbar + marquee + hero,
 *   so its top-left = the page's top-left. The Figma decor coordinates
 *   are relative to that same origin — `top=-95.26` etc. anchors the
 *   shapes to the page, not the hero. Anchoring inside the hero would
 *   push the cluster a navbar-height (≈140px) below where Figma puts it.
 *
 * Stacking + interaction:
 * - `pointer-events-none` lets clicks fall through to the hero CTAs.
 * - `-z-10` tucks the cluster behind hero copy. `<main>` owns an
 *   `isolate` stacking context so this `-10` never escapes that boundary
 *   (otherwise it would slip beneath the body's painted bg and vanish).
 * - Hidden below `sm:` — the 538/672px shapes behind stacked mobile copy
 *   crowd the layout. Mobile keeps the clean cream wash.
 *
 * @returns Absolutely-positioned cluster of three brand-colored
 *   rounded squares bleeding off the page's top-left corner.
 */
export function PricingHeroDecor() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 -z-10 hidden overflow-visible sm:block"
		>
			{/* Sky-colored square — back of the stack, peeks from the far
			    left. Figma: `538.52×538.52, left=-237.62, top=-95.26,
			    rotate=15deg, origin-top-left`. We round to the spacing
			    scale (`size-135` = 540px ≈ 538.52, `-left-60` = -240px,
			    `-top-24` = -96px). `rotate-tilt-sm` resolves to 15deg. */}
			<div className="bg-brand-sky rotate-tilt-sm absolute -top-24 -left-60 size-135 origin-top-left rounded-3xl" />
			{/* Mint-colored square — middle of the stack, the largest of
			    the three. Pushed up the most so only the lower-left fringe
			    reads inside the page. Figma: `672.47×672.47, left=39.36,
			    top=-384.48, rotate=25.5deg, origin-top-left`. `size-168` =
			    672px ≈ 672.47, `left-10` = 40px ≈ 39.36, `-top-96` = -384px
			    ≈ -384.48. `rotate-tilt-lg` resolves to 25deg (0.5° below
			    perceptual threshold; keeps the named token ladder intact). */}
			<div className="bg-brand-mint rotate-tilt-lg absolute -top-96 left-10 size-168 origin-top-left rounded-3xl" />
			{/* Yellow-colored square — front of the stack, dominates the
			    visible cluster. Counter-rotated so the three shapes don't
			    read as three rotations of the same square. Figma:
			    `538.52×538.52, left=123.36, top=-193.74, rotate=-30deg,
			    origin-top-left`. `size-135` ≈ 538.52, `left-30` = 120px ≈
			    123.36, `-top-48` = -192px ≈ -193.74. `-rotate-tilt-xl`
			    resolves to -30deg — exact match. */}
			<div className="bg-brand-yellow -rotate-tilt-xl absolute -top-48 left-30 size-135 origin-top-left rounded-3xl" />
		</div>
	);
}
